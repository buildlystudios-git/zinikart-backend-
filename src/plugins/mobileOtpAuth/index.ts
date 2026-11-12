import type { Plugin } from 'payload'
import type { MobileOtpAuthPluginOptions } from './types'
import { extendUsersCollection } from './extend'
import { requestOtpEndpoint, verifyOtpEndpoint, meEndpoint } from './endpoints'

export const mobileOtpAuthPlugin =
  ({ enabled = true, usersSlug = 'users' }: MobileOtpAuthPluginOptions = {}): Plugin =>
  (config) => {
    if (!enabled) {
      return config
    }

    const configWithUsers = extendUsersCollection(config, usersSlug)

    return {
      ...configWithUsers,
      endpoints: [
        ...(configWithUsers.endpoints || []),
        requestOtpEndpoint(usersSlug),
        verifyOtpEndpoint(usersSlug),
        meEndpoint(usersSlug),
      ],
    }
  }

export { mobileOtpAuthPaths } from './openapi'
export { requestOtp, verifyOtp } from './otpService'
export { requestMsg91Otp, verifyMsg91Otp } from './msg91'
export { requestTwilioOtp, verifyTwilioOtp } from './twilio'

