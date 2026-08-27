import type { PayloadRequest } from 'payload'
import { headersWithCors } from 'payload'
import { OTP_TEST_MOBILE_NUMBER, OTP_TEST_CODE, OTP_AUTH_EMAIL_DOMAIN } from './constants'
import type { OtpRequestBody, OtpVerifyBody } from './types'

export const normalizeMobileNumber = (value?: string): string => {
  const raw = value?.trim()

  if (!raw) {
    throw new Error('Mobile number is required.')
  }

  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')

  if (hasPlus) {
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`
    }
  } else {
    if (digits.length === 10) {
      return `+91${digits}`
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`
    }
  }

  throw new Error('Mobile number must be a valid 10-digit number or E.164 format.')
}

export const syntheticEmailForMobile = (mobileNumber: string): string => {
  const normalized = mobileNumber.replace(/^\+/, '').replace(/\D/g, '')
  return `${normalized}@${OTP_AUTH_EMAIL_DOMAIN}`
}

export const getMobileNumberFromBody = (body: OtpRequestBody): string => {
  return normalizeMobileNumber(body.mobileNumber || body.phone)
}

export const getCodeFromBody = (body: OtpVerifyBody): string => {
  const code = (body.code || body.otp || '').trim()

  if (!/^\d{4,8}$/.test(code)) {
    throw new Error('OTP code is required.')
  }

  return code
}

export const isTestOtp = (mobileNumber: string, code?: string): boolean => {
  // TODO: Remove this test account pattern for prod
  const isTestAccount =
    mobileNumber === OTP_TEST_MOBILE_NUMBER || /^\+?(91)?998877\d{4}$/.test(mobileNumber)

  if (code) {
    return isTestAccount && code === OTP_TEST_CODE
  }

  return isTestAccount
}

export const sanitizeMobileUser = (user: any) => {
  const cartDoc = user.cart?.docs?.[0]
  const cartId = cartDoc ? (typeof cartDoc === 'object' ? cartDoc.id : cartDoc) : null

  return {
    id: user.id,
    email: user.email?.endsWith(`@${OTP_AUTH_EMAIL_DOMAIN}`) ? null : user.email,
    mobileNumber: user.mobileNumber,
    mobileVerified: user.mobileVerified,
    name: user.name || null,
    roles: user.roles || [],
    cartId,
  }
}

export const jsonResponse = (req: PayloadRequest, body: unknown, init?: ResponseInit) => {
  return Response.json(body, {
    ...init,
    headers: headersWithCors({
      headers: new Headers(init?.headers),
      req,
    }),
  })
}

export const errorResponse = (req: PayloadRequest, message: string, status = 400) => {
  return jsonResponse(
    req,
    {
      error: message,
      success: false,
    },
    { status },
  )
}
