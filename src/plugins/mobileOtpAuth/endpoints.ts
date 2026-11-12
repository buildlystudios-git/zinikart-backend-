import type { Endpoint } from 'payload'
import { generatePayloadCookie } from 'payload'
import type { OtpRequestBody, OtpVerifyBody } from './types'
import {
  getMobileNumberFromBody,
  getCodeFromBody,
  normalizeMobileNumber,
  isTestOtp,
  sanitizeMobileUser,
  jsonResponse,
  errorResponse,
} from './helpers'
import { requestOtp, verifyOtp } from './otpService'
import { verifyMsg91AccessToken } from './msg91'
import {
  findUserByMobileNumber,
  createOtpUser,
  markUserOtpLogin,
  createSessionToken,
  getUsersCollection,
  getUserStatus,
} from './services'

export const requestOtpEndpoint = (usersSlug: string): Endpoint => ({
  method: 'post',
  path: '/mobile/auth/otp/request',
  handler: async (req) => {
    try {
      const body = (await req.json?.()) as OtpRequestBody
      const mobileNumber = getMobileNumberFromBody(body)

      let reqId: string | undefined
      if (!isTestOtp(mobileNumber)) {
        const otpRes = await requestOtp(mobileNumber)
        reqId = otpRes?.reqId
      }

      return jsonResponse(req, {
        mobileNumber,
        ...(reqId ? { reqId } : {}),
        success: true,
        test: isTestOtp(mobileNumber),
      })
    } catch (error) {
      req.payload.logger.error({ err: error }, 'OTP request failed')
      return errorResponse(req, error instanceof Error ? error.message : 'Unable to request OTP.')
    }
  },
  custom: {
    openapi: {
      summary: 'Request mobile OTP',
    },
  },
})

export const verifyOtpEndpoint = (usersSlug: string): Endpoint => ({
  method: 'post',
  path: '/mobile/auth/otp/verify',
  handler: async (req) => {
    try {
      const body = (await req.json?.()) as any
      const accessToken = body?.accessToken || body?.['access-token']
      const name = body?.name?.trim()
      const role = body?.role || 'customer'

      if (!['customer', 'retailer', 'delivery_partner'].includes(role)) {
        return errorResponse(req, 'Invalid role requested.', 400)
      }

      let mobileNumber: string

      // Flow 1: Client authenticated via MSG91 Widget and passed the access token
      if (accessToken) {
        const verifiedNumber = await verifyMsg91AccessToken(accessToken)
        if (!verifiedNumber) {
          return errorResponse(req, 'Invalid or expired MSG91 access token.', 401)
        }
        mobileNumber = normalizeMobileNumber(verifiedNumber)
      } else {
        // Flow 2: Traditional mobileNumber + code verification
        mobileNumber = getMobileNumberFromBody(body)
        const code = getCodeFromBody(body)
        const reqId = body?.reqId

        const approved =
          isTestOtp(mobileNumber, code) || (await verifyOtp(mobileNumber, code, reqId))

        if (!approved) {
          return errorResponse(req, 'Invalid OTP code.', 401)
        }
      }

      let user = await findUserByMobileNumber(req, usersSlug, mobileNumber)
      let exists = true

      if (!user) {
        exists = false
        user = await createOtpUser(req, usersSlug, mobileNumber, name, role)
      } else {
        const userRoles = Array.isArray(user.roles) ? user.roles : []
        const isAdmin = userRoles.includes('admin')
        if (!isAdmin && role !== 'customer' && !userRoles.includes(role)) {
          const roleLabel = role === 'delivery_partner' ? 'delivery partner' : role
          return errorResponse(req, `Your account is not registered as a ${roleLabel}.`, 403)
        }
      }

      let cartId: string | number | null = null
      // Auto-create cart if the user doesn't have one and is a customer
      if (role === 'customer') {
        const existingCart = await req.payload.find({
          collection: 'carts',
          where: { customer: { equals: user.id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        if (existingCart.totalDocs === 0) {
          const createdCart = await req.payload.create({
            collection: 'carts',
            data: {
              customer: user.id,
            },
            overrideAccess: true,
          })
          cartId = createdCart.id
        } else {
          cartId = existingCart.docs[0].id
        }
      }

      user = await markUserOtpLogin(req, usersSlug, user.id)

      const status = await getUserStatus(req, user, role)

      let token: string | null = null
      let exp: number | null = null
      const headers = new Headers()

      if (status === 'approved' || status === 'approved_no_products' || status === 'registration_required' || status === "pending_approval") {
        const session = await createSessionToken({
          req,
          user,
          usersSlug,
        })
        token = session.token
        exp = session.exp

        const usersCollection = getUsersCollection(req, usersSlug)
        const cookie = generatePayloadCookie({
          collectionAuthConfig: usersCollection.config.auth,
          cookiePrefix: req.payload.config.cookiePrefix,
          token,
        })
        headers.set('Set-Cookie', cookie)
      }

      return jsonResponse(
        req,
        {
          success: true,
          status,
          exists,
          exp,
          token,
          user: sanitizeMobileUser(user, cartId),
        },
        {
          headers,
        },
      )
    } catch (error) {
      req.payload.logger.error({ err: error }, 'OTP verification failed')
      return errorResponse(req, error instanceof Error ? error.message : 'Unable to verify OTP.')
    }
  },
  custom: {
    openapi: {
      summary: 'Verify mobile OTP and login',
    },
  },
})

export const meEndpoint = (usersSlug: string = 'users'): Endpoint => ({
  method: 'get',
  path: '/mobile/auth/me',
  handler: async (req) => {
    if (!req.user) {
      return errorResponse(req, 'Unauthorized.', 401)
    }

    const fullUser = await req.payload.findByID({
      collection: usersSlug as 'users',
      id: req.user.id,
      depth: 1,
      overrideAccess: true,
    })

    const currentUser = fullUser || req.user
    const status = await getUserStatus(req, currentUser)

    return jsonResponse(req, {
      user: sanitizeMobileUser(currentUser),
      status,
    })
  },
  custom: {
    openapi: {
      summary: 'Get current mobile user',
    },
  },
})
