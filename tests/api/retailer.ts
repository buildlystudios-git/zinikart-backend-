import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'

export async function runRetailerTests(
  report: ReportManager,
  payload: Payload,
  testMobile: string,
  otherUserToken: string
) {
  report.setSuite('Retailer Profile Lifecycle')
  console.log('\nRunning Retailer Profile Lifecycle tests...')

  const testOtp = '111111'

  // Step 0: Obtain a fresh registration token for our test user
  const loginRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'retailer',
  })
  const token = loginRes.body?.token
  const userId = loginRes.body?.user?.id

  if (!token || !userId) {
    report.assert('Retailer setup failed: missing token or userId', false, 'Best Case')
    return
  }

  // --- IMPOSSIBLE & SECURITY CASES ---

  // 1. Attempt to create profile without authentication (returns 401)
  const unauthCreateRes = await apiRequest('/api/retailers', 'POST', {
    shopName: 'Hackers Shop',
    ownerName: 'Hacker',
    mobileNumber: testMobile,
    gstNumber: 'GST1234567',
    shopAddress: {
      street: '123 Fake St',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
    },
    bankDetails: {
      accountHolderName: 'Hacker',
      accountNumber: '999999',
      ifscCode: 'IFSC999',
      bankName: 'HackerBank',
    },
  })
  report.assert(
    'Attempt to create profile without auth token returns 401 or 403 error',
    unauthCreateRes.status === 401 || unauthCreateRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${unauthCreateRes.status}`
  )

  // --- BEST CASE CASES ---

  // 2. Create profile with valid token & data
  const createProfileRes = await apiRequest(
    '/api/retailers',
    'POST',
    {
      shopName: 'Madhav Gadgets',
      ownerName: 'Madhav Seller',
      mobileNumber: testMobile,
      gstNumber: 'GST99ABCDE1234',
      shopAddress: {
        street: '456 Tech Park Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560001',
      },
      bankDetails: {
        accountHolderName: 'Madhav Seller',
        accountNumber: '9876543210',
        ifscCode: 'IFSC0009876',
        bankName: 'Innovators Bank',
      },
      // Worst Case test: try to set approvalStatus during creation
      approvalStatus: 'approved',
    },
    token
  )

  const profileId = createProfileRes.body?.doc?.id
  const isCreated = createProfileRes.status === 201 && typeof profileId === 'number'

  report.assert(
    'Create retailer profile with valid data returns 201 and profile document ID',
    isCreated,
    'Best Case',
    `Expected status 201, got ${createProfileRes.status}. Response: ${JSON.stringify(createProfileRes.body)}`
  )

  if (!isCreated) return

  // 3. Field Access Security check: approvalStatus is protected during creation
  report.assert(
    'Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending)',
    createProfileRes.body?.doc?.approvalStatus === 'pending',
    'Worst Case',
    `Expected approvalStatus pending, got ${createProfileRes.body?.doc?.approvalStatus}`
  )

  // 4. Verify status pending_approval is returned (token is null)
  const verifyPendingRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'retailer',
  })
  report.assert(
    'Verify OTP for retailer with pending profile returns status pending_approval and null token',
    verifyPendingRes.status === 200 &&
      verifyPendingRes.body?.status === 'pending_approval' &&
      verifyPendingRes.body?.token === null,
    'Best Case',
    `Expected status pending_approval and token null, got status ${verifyPendingRes.body?.status} and token ${verifyPendingRes.body?.token}`
  )

  // --- SECURITY / WORST CASE SCENARIOS ---

  // 5. Access Control: A different user cannot read this retailer profile
  const readByOtherRes = await apiRequest(`/api/retailers/${profileId}`, 'GET', null, otherUserToken)
  report.assert(
    'Access Control: Unauthorized user is blocked from reading another user\'s profile (returns 403 or 404)',
    readByOtherRes.status === 403 || readByOtherRes.status === 404,
    'Worst Case',
    `Expected status 403 or 404, got ${readByOtherRes.status}`
  )

  // 6. Access Control: A different user cannot update this retailer profile
  const updateByOtherRes = await apiRequest(
    `/api/retailers/${profileId}`,
    'PATCH',
    { shopName: 'Hacked Shop' },
    otherUserToken
  )
  report.assert(
    'Access Control: Unauthorized user is blocked from updating another user\'s profile (returns 403 or 404)',
    updateByOtherRes.status === 403 || updateByOtherRes.status === 404,
    'Worst Case',
    `Expected status 403 or 404, got ${updateByOtherRes.status}`
  )

  // 7. Field Access Security: Owner cannot elevate their own approvalStatus to approved (returns 403/field error or keeps pending)
  const selfApproveRes = await apiRequest(
    `/api/retailers/${profileId}`,
    'PATCH',
    { approvalStatus: 'approved' },
    token
  )
  report.assert(
    'Field Access Security: Owner is blocked from changing their own approvalStatus (value remains pending or is ignored)',
    selfApproveRes.status === 403 ||
      selfApproveRes.body?.doc?.approvalStatus === 'pending' ||
      !selfApproveRes.body?.doc,
    'Worst Case',
    `Expected block or status to remain pending, response code: ${selfApproveRes.status}`
  )

  // --- IMPOSSIBLE CASES ---

  // 8. Attempt to create a duplicate retailer profile for the same user (returns 400 or 500 error)
  const duplicateRes = await apiRequest(
    '/api/retailers',
    'POST',
    {
      shopName: 'Duplicate Shop',
      ownerName: 'Another Owner',
      mobileNumber: testMobile,
      gstNumber: 'GST99ABCDE1234',
      shopAddress: {
        street: '123 Fake St',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
      },
      bankDetails: {
        accountHolderName: 'Another Owner',
        accountNumber: '999999',
        ifscCode: 'IFSC999',
        bankName: 'HackerBank',
      },
    },
    token
  )
  report.assert(
    'Attempt to create duplicate retailer profile for the same user is rejected (returns non-201 status)',
    duplicateRes.status !== 201,
    'Impossible Scenario',
    `Expected duplicate creation to fail, but it succeeded with status: ${duplicateRes.status}`
  )

  // --- ADMIN SYSTEM TRANSITION ---

  // 9. Admin elevates status to approved via Payload local API
  await payload.update({
    collection: 'retailers',
    id: profileId,
    data: {
      approvalStatus: 'approved',
    },
    overrideAccess: true,
  })

  // 10. Verify status approved is returned with token
  const verifyApprovedRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'retailer',
  })
  report.assert(
    'Verify OTP for approved retailer profile returns status approved and JWT token',
    verifyApprovedRes.status === 200 &&
      verifyApprovedRes.body?.status === 'approved' &&
      typeof verifyApprovedRes.body?.token === 'string',
    'Best Case',
    `Expected status approved and token, got status ${verifyApprovedRes.body?.status}`
  )
}
