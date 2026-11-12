import { OTP_PROVIDER } from '@/constants/env'
import { requestTwilioOtp, verifyTwilioOtp } from './twilio'
import { requestMsg91Otp, verifyMsg91Otp } from './msg91'

/**
 * Dispatches an OTP dispatch request to the active provider (MSG91 or Twilio).
 * Defaults to MSG91 unless OTP_PROVIDER is explicitly set to 'twilio'.
 */
export const requestOtp = async (mobileNumber: string): Promise<{ reqId?: string }> => {
  if (OTP_PROVIDER === 'twilio') {
    await requestTwilioOtp(mobileNumber)
    return {}
  }
  return requestMsg91Otp(mobileNumber)
}

/**
 * Dispatches an OTP verification request to the active provider (MSG91 or Twilio).
 * Defaults to MSG91 unless OTP_PROVIDER is explicitly set to 'twilio'.
 */
export const verifyOtp = async (
  mobileNumber: string,
  code: string,
  reqId?: string,
): Promise<boolean> => {
  if (OTP_PROVIDER === 'twilio') {
    return verifyTwilioOtp(mobileNumber, code)
  }
  return verifyMsg91Otp(mobileNumber, code, reqId)
}
