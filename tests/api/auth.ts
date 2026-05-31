import { ReportManager, apiRequest } from './helpers'

export async function runAuthTests(report: ReportManager, testMobile: string) {
  report.setSuite('Authentication Endpoints')
  console.log('\nRunning Authentication Endpoints tests...')

  const testOtp = '111111'

  // --- BEST CASE SCENARIOS ---

  // 1. Request OTP with a valid mobile number
  const reqOtpRes = await apiRequest('/api/mobile/auth/otp/request', 'POST', {
    mobileNumber: testMobile,
  })
  report.assert(
    'Request OTP with a valid mobile number returns 200 and success: true',
    reqOtpRes.status === 200 && reqOtpRes.body?.success === true,
    'Best Case'
  )

  // 2. Verify OTP with correct code and retailer role context (returns registration_required for new user)
  const verifyRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'retailer',
    name: 'Jane AuthTest',
  })
  report.assert(
    'Verify OTP with correct code and retailer role context returns 200, status registration_required, and JWT token',
    verifyRes.status === 200 &&
      verifyRes.body?.status === 'registration_required' &&
      typeof verifyRes.body?.token === 'string',
    'Best Case',
    `Expected status registration_required, got ${verifyRes.body?.status}. Response: ${JSON.stringify(verifyRes.body)}`
  )

  // 3. User name parameter option is correctly saved
  report.assert(
    'Verify OTP saves the optional name parameter on user creation',
    verifyRes.body?.user?.name === 'Jane AuthTest',
    'Possible Scenario',
    `Expected name Jane AuthTest, got ${verifyRes.body?.user?.name}`
  )

  // 4. Verify OTP with correct code and delivery_partner role context for an existing user
  const verifyPartnerRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'delivery_partner',
  })
  report.assert(
    'Verify OTP for an existing user requesting a new role updates the user roles list',
    verifyPartnerRes.status === 200 &&
      verifyPartnerRes.body?.user?.roles?.includes('delivery_partner') &&
      verifyPartnerRes.body?.user?.roles?.includes('retailer'),
    'Possible Scenario',
    `Expected roles to contain delivery_partner and retailer, got ${JSON.stringify(verifyPartnerRes.body?.user?.roles)}`
  )


  // --- IMPOSSIBLE & EDGE SCENARIOS ---

  // 5. Request OTP with missing phone number (returns 400)
  const emptyReqRes = await apiRequest('/api/mobile/auth/otp/request', 'POST', {})
  report.assert(
    'Request OTP with missing phone number returns 400 error',
    emptyReqRes.status === 400 && emptyReqRes.body?.success === false,
    'Impossible Scenario',
    `Expected status 400, got ${emptyReqRes.status}`
  )

  // 6. Request OTP with malformed phone number (returns 400)
  const malformedReqRes = await apiRequest('/api/mobile/auth/otp/request', 'POST', {
    mobileNumber: '12345',
  })
  report.assert(
    'Request OTP with malformed phone number returns 400 error',
    malformedReqRes.status === 400 && malformedReqRes.body?.success === false,
    'Impossible Scenario',
    `Expected status 400, got ${malformedReqRes.status}`
  )

  // 7. Verify OTP with incorrect code (returns 401)
  const wrongCodeRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: '999999',
    role: 'retailer',
  })
  report.assert(
    'Verify OTP with incorrect code returns 401 unauthorized error',
    wrongCodeRes.status === 401 && wrongCodeRes.body?.success === false,
    'Impossible Scenario',
    `Expected status 401, got ${wrongCodeRes.status}`
  )

  // 8. Verify OTP with invalid role parameter (returns 400)
  const invalidRoleRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'invalid_role' as any,
  })
  report.assert(
    'Verify OTP with invalid role parameter returns 400 error',
    invalidRoleRes.status === 400 && invalidRoleRes.body?.success === false,
    'Impossible Scenario',
    `Expected status 400, got ${invalidRoleRes.status}`
  )
}
