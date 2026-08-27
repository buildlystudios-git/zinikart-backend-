import type { Endpoint } from 'payload'
import { generatePayloadCookie } from 'payload'
import type { OtpRequestBody, OtpVerifyBody } from './types'
import {
  getMobileNumberFromBody,
  getCodeFromBody,
  isTestOtp,
  sanitizeMobileUser,
  jsonResponse,
  errorResponse,
} from './helpers'
import { requestTwilioOtp, verifyTwilioOtp } from './twilio'
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

      if (!isTestOtp(mobileNumber)) {
        await requestTwilioOtp(mobileNumber)
      }

      return jsonResponse(req, {
        mobileNumber,
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
      const body = (await req.json?.()) as OtpVerifyBody
      const mobileNumber = getMobileNumberFromBody(body)
      const code = getCodeFromBody(body)
      const name = body.name?.trim()
      const role = body.role || 'customer'

      if (!['customer', 'retailer', 'delivery_partner'].includes(role)) {
        return errorResponse(req, 'Invalid role requested.', 400)
      }

      const approved = isTestOtp(mobileNumber, code) || (await verifyTwilioOtp(mobileNumber, code))

      if (!approved) {
        return errorResponse(req, 'Invalid OTP code.', 401)
      }

      let user = await findUserByMobileNumber(req, usersSlug, mobileNumber)
      let exists = true

      if (!user) {
        exists = false
        user = await createOtpUser(req, usersSlug, mobileNumber, name, role)
      }

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
          await req.payload.create({
            collection: 'carts',
            data: {
              customer: user.id,
            },
            overrideAccess: true,
          })
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
          user: sanitizeMobileUser(user),
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

export const meEndpoint = (): Endpoint => ({
  method: 'get',
  path: '/mobile/auth/me',
  handler: async (req) => {
    if (!req.user) {
      return errorResponse(req, 'Unauthorized.', 401)
    }

    const status = await getUserStatus(req, req.user)

    return jsonResponse(req, {
      user: sanitizeMobileUser(req.user),
      status,
    })
  },
  custom: {
    openapi: {
      summary: 'Get current mobile user',
    },
  },
})
