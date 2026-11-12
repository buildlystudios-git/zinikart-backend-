import msg91Pkg from 'msg91'
import {
  MSG91_AUTH_KEY,
  MSG91_TOKEN_AUTH,
  MSG91_WIDGET_ID,
  MSG91_TEMPLATE_ID,
  MSG91_OTP_LENGTH,
  MSG91_OTP_EXPIRY,
} from '@/constants/env'

const msg91 = (msg91Pkg as any).default || msg91Pkg

let isInitialized = false

// In-memory cache for Widget reqId (formattedMobile -> { reqId, timestamp })
const widgetReqIdMap = new Map<string, { reqId: string; timestamp: number }>()

const REQ_ID_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

export function storeReqId(mobile: string, reqId: string): void {
  const now = Date.now()
  widgetReqIdMap.set(mobile, { reqId, timestamp: now })

  // Periodic cleanup if map grows
  if (widgetReqIdMap.size > 1000) {
    for (const [key, val] of widgetReqIdMap.entries()) {
      if (now - val.timestamp > REQ_ID_EXPIRY_MS) {
        widgetReqIdMap.delete(key)
      }
    }
  }
}

export function getStoredReqId(mobile: string): string | undefined {
  const entry = widgetReqIdMap.get(mobile)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > REQ_ID_EXPIRY_MS) {
    widgetReqIdMap.delete(mobile)
    return undefined
  }
  return entry.reqId
}

/**
 * Normalizes phone number for MSG91 by removing leading '+' and non-digits.
 * MSG91 expects country code + phone without '+' (e.g., '919999999990').
 */
export const formatMobileNumberForMsg91 = (mobileNumber: string): string => {
  return mobileNumber.replace(/^\+/, '').replace(/\D/g, '')
}

/**
 * Initializes and returns the classic MSG91 template OTP client instance.
 */
function getMsg91OtpClient() {
  const authKey = MSG91_AUTH_KEY
  const templateId = MSG91_TEMPLATE_ID

  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured. Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID.')
  }

  if (!isInitialized) {
    msg91.initialize({ authKey })
    isInitialized = true
  }

  return msg91.getOTP(templateId, {
    authKey,
    length: MSG91_OTP_LENGTH || 6,
  })
}

/**
 * Sends an OTP via MSG91 (using Widget API if MSG91_WIDGET_ID is provided,
 * or falling back to SendOTP template API if MSG91_TEMPLATE_ID is provided).
 */
export const requestMsg91Otp = async (
  mobileNumber: string,
): Promise<{ reqId?: string }> => {
  const formattedMobile = formatMobileNumberForMsg91(mobileNumber)

  if (!MSG91_AUTH_KEY) {
    throw new Error('MSG91 is not configured. Missing MSG91_AUTH_KEY in environment.')
  }

  // --- Path A: MSG91 OTP Widget API ---
  if (MSG91_WIDGET_ID) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (MSG91_AUTH_KEY) headers.authkey = MSG91_AUTH_KEY
    if (MSG91_TOKEN_AUTH) headers.token = MSG91_TOKEN_AUTH

    const response = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        widgetId: MSG91_WIDGET_ID,
        identifier: formattedMobile,
        ...(MSG91_TOKEN_AUTH ? { tokenAuth: MSG91_TOKEN_AUTH } : {}),
      }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      type?: string
      message?: string
      reqId?: string
    }

    if (!response.ok || data?.type === 'error') {
      throw new Error(data?.message || `Failed to send OTP via MSG91 Widget (HTTP ${response.status})`)
    }

    const reqId =
      data?.reqId ||
      (data?.type === 'success' && data?.message && data.message.length > 5 ? data.message : undefined)

    if (reqId) {
      storeReqId(formattedMobile, reqId)
    }

    return { reqId }
  }

  // --- Path B: Classic SendOTP Template API ---
  if (MSG91_TEMPLATE_ID) {
    const otpService = getMsg91OtpClient()
    try {
      const res: any = await otpService.send(formattedMobile, {
        templateId: MSG91_TEMPLATE_ID,
        expiry: MSG91_OTP_EXPIRY || 10,
        length: MSG91_OTP_LENGTH || 6,
      })

      if (res?.type === 'error') {
        throw new Error(res.message || 'Unable to send OTP via MSG91.')
      }

      return {}
    } catch (error: any) {
      const msg =
        error?.message || (typeof error === 'string' ? error : 'Unable to send OTP via MSG91.')
      throw new Error(msg)
    }
  }

  throw new Error('MSG91 is not configured. Please provide MSG91_WIDGET_ID or MSG91_TEMPLATE_ID.')
}

/**
 * Verifies an OTP code via MSG91.
 * Supports both Widget API (using stored/passed reqId) and classic SendOTP template API.
 */
export const verifyMsg91Otp = async (
  mobileNumber: string,
  code: string,
  providedReqId?: string,
): Promise<boolean> => {
  const formattedMobile = formatMobileNumberForMsg91(mobileNumber)

  if (!MSG91_AUTH_KEY) {
    return false
  }

  // --- Path A: MSG91 OTP Widget API ---
  if (MSG91_WIDGET_ID) {
    const reqId = providedReqId || getStoredReqId(formattedMobile)
    if (!reqId) {
      // In Widget mode, reqId is required by MSG91 to match the session
      return false
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (MSG91_AUTH_KEY) headers.authkey = MSG91_AUTH_KEY
      if (MSG91_TOKEN_AUTH) headers.token = MSG91_TOKEN_AUTH

      const response = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          widgetId: MSG91_WIDGET_ID,
          reqId,
          otp: code,
          ...(MSG91_TOKEN_AUTH ? { tokenAuth: MSG91_TOKEN_AUTH } : {}),
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        type?: string
        message?: string
      }

      if (!response.ok || data?.type === 'error') {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  // --- Path B: Classic SendOTP Template API ---
  if (MSG91_TEMPLATE_ID) {
    const otpService = getMsg91OtpClient()
    try {
      const res: any = await otpService.verify(formattedMobile, code)
      if (
        res &&
        (res.type === 'error' || res.message === 'OTP not match' || res.message === 'OTP expired')
      ) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  return false
}

/**
 * Verifies a client-side MSG91 OTP Widget JWT access token.
 * Calls https://control.msg91.com/api/v5/widget/verifyAccessToken
 * Returns the verified mobile number (e.g. '+919999999999') on success, or null on failure.
 */
export const verifyMsg91AccessToken = async (accessToken: string): Promise<string | null> => {
  if (!MSG91_AUTH_KEY || !accessToken) {
    return null
  }

  try {
    const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': accessToken,
      }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      type?: string
      message?: string
    }

    if (data?.type === 'success' && data?.message) {
      // data.message contains the verified phone number (e.g. "919999999999")
      const digits = data.message.trim().replace(/\D/g, '')
      return digits ? `+${digits}` : null
    }

    return null
  } catch {
    return null
  }
}
