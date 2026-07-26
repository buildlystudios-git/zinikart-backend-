import type { FieldHook } from 'payload'
import { normalizeMobileNumber } from '@/plugins/mobileOtpAuth/helpers'

export const normalizeMobileNumberFieldHook: FieldHook = ({ value }) => {
  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeMobileNumber(value)
    } catch (e) {
      // If validation fails, return original value so Payload validation can catch it 
      // or we can let it throw. Throwing here is fine because it will bubble up as a validation error.
      throw e
    }
  }
  return value
}
