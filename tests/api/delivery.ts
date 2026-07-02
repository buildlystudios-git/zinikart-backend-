import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'

export async function runDeliveryTests(
  report: ReportManager,
  payload: Payload,
  testMobile: string,
  otherUserToken: string
) {
  report.setSuite('Delivery Partner Lifecycle')
  console.log('\nRunning Delivery Partner Lifecycle tests...')

  const testOtp = '111111'

  // Step 0: Obtain a fresh registration token for our test user
  const loginRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'delivery_partner',
  })
  const token = loginRes.body?.token
  const userId = loginRes.body?.user?.id

  if (!token || !userId) {
    report.assert('Delivery partner setup failed: missing token or userId', false, 'Best Case')
    return
  }

  // Find a media ID to use for drivingLicense upload
  const mediaDocs = await payload.find({
    collection: 'media',
    limit: 1,
    overrideAccess: true,
  })
  let mediaId = mediaDocs.docs[0]?.id
  if (!mediaId) {
    const mockMedia = await payload.create({
      collection: 'media',
      data: {
        alt: 'Mock License',
      },
      file: {
        name: 'license.pdf',
        data: Buffer.from('mock license data'),
        mimetype: 'application/pdf',
        size: 17,
      },
      overrideAccess: true,
    })
    mediaId = mockMedia.id
  }

  // --- IMPOSSIBLE & SECURITY CASES ---

  // 1. Attempt to create profile without driving license (should return 400 error as it's required)
  const noLicenseRes = await apiRequest(
    '/api/delivery-partners',
    'POST',
    {
      fullName: 'NoLicense Rider',
      mobileNumber: testMobile,
      email: 'nolicense@example.com',
      vehicleType: 'scooter',
    },
    token
  )
  report.assert(
    'Attempt to create profile without driving license document returns error (non-201 status)',
    noLicenseRes.status !== 201,
    'Impossible Scenario',
    `Expected failure, got status ${noLicenseRes.status}`
  )

  // 2. Attempt to create profile without authentication (returns 401)
  const unauthCreateRes = await apiRequest('/api/delivery-partners', 'POST', {
    fullName: 'Hack Rider',
    mobileNumber: testMobile,
    email: 'hacker@example.com',
    drivingLicense: mediaId,
    vehicleType: 'bike',
  })
  report.assert(
    'Attempt to create profile without auth token returns 401 or 403 error',
    unauthCreateRes.status === 401 || unauthCreateRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${unauthCreateRes.status}`
  )

  // --- BEST CASE CASES ---

  // 3. Create profile with valid token & data
  const createProfileRes = await apiRequest(
    '/api/delivery-partners',
    'POST',
    {
      fullName: 'Jane Delivery Rider',
      mobileNumber: testMobile,
      email: 'jane.rider@example.com',
      drivingLicense: mediaId,
      vehicleType: 'scooter',
      // Worst Case: try to set approvalStatus on creation
      approvalStatus: 'approved',
    },
    token
  )

  const profileId = createProfileRes.body?.doc?.id
  const isCreated = createProfileRes.status === 201 && typeof profileId === 'string'

  report.assert(
    'Create delivery partner profile with valid data returns 201 and profile document ID',
    isCreated,
    'Best Case',
    `Expected status 201, got ${createProfileRes.status}. Response: ${JSON.stringify(createProfileRes.body)}`
  )

  if (!isCreated) return

  // 4. Field Access Security check: approvalStatus is protected during creation
  report.assert(
    'Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending)',
    createProfileRes.body?.doc?.approvalStatus === 'pending',
    'Worst Case',
    `Expected approvalStatus pending, got ${createProfileRes.body?.doc?.approvalStatus}`
  )

  // 5. Verify status pending_approval is returned (token is null)
  const verifyPendingRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'delivery_partner',
  })
  report.assert(
    'Verify OTP for delivery partner with pending profile returns status pending_approval and null token',
    verifyPendingRes.status === 200 &&
      verifyPendingRes.body?.status === 'pending_approval' &&
      verifyPendingRes.body?.token === null,
    'Best Case',
    `Expected status pending_approval and token null, got status ${verifyPendingRes.body?.status}`
  )

  // --- SECURITY / WORST CASE SCENARIOS ---

  // 6. Access Control: A different user cannot read this delivery partner profile
  const readByOtherRes = await apiRequest(`/api/delivery-partners/${profileId}`, 'GET', null, otherUserToken)
  report.assert(
    'Access Control: Unauthorized user is blocked from reading another user\'s profile (returns 403 or 404)',
    readByOtherRes.status === 403 || readByOtherRes.status === 404,
    'Worst Case',
    `Expected status 403 or 404, got ${readByOtherRes.status}`
  )

  // 7. Access Control: A different user cannot update this delivery partner profile
  const updateByOtherRes = await apiRequest(
    `/api/delivery-partners/${profileId}`,
    'PATCH',
    { fullName: 'Hacked Rider Name' },
    otherUserToken
  )
  report.assert(
    'Access Control: Unauthorized user is blocked from updating another user\'s profile (returns 403 or 404)',
    updateByOtherRes.status === 403 || updateByOtherRes.status === 404,
    'Worst Case',
    `Expected status 403 or 404, got ${updateByOtherRes.status}`
  )

  // 8. Field Access Security: Owner cannot elevate their own approvalStatus to approved (value remains pending or is ignored)
  const selfApproveRes = await apiRequest(
    `/api/delivery-partners/${profileId}`,
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

  // --- ONLINE STATUS MODIFICATION BY OWNER ---

  // 9. Best Case: Owner can update onlineStatus (it does not require adminOnlyFieldAccess)
  const toggleOnlineRes = await apiRequest(
    `/api/delivery-partners/${profileId}`,
    'PATCH',
    { onlineStatus: true },
    token
  )
  report.assert(
    'Profile Owner is allowed to toggle their own onlineStatus',
    toggleOnlineRes.status === 200 && toggleOnlineRes.body?.doc?.onlineStatus === true,
    'Possible Scenario',
    `Expected status 200 and onlineStatus: true, got code ${toggleOnlineRes.status}`
  )

  // --- IMPOSSIBLE CASES ---

  // 10. Attempt to create a duplicate delivery partner profile for the same user (returns 400 or 500 error)
  const duplicateRes = await apiRequest(
    '/api/delivery-partners',
    'POST',
    {
      fullName: 'Duplicate Rider',
      mobileNumber: testMobile,
      email: 'dup@example.com',
      drivingLicense: mediaId,
      vehicleType: 'scooter',
    },
    token
  )
  report.assert(
    'Attempt to create duplicate delivery partner profile for the same user is rejected (returns non-201 status)',
    duplicateRes.status !== 201,
    'Impossible Scenario',
    `Expected duplicate creation to fail, but it succeeded with status: ${duplicateRes.status}`
  )

  // --- ADMIN SYSTEM TRANSITION ---

  // 11. Admin elevates status to approved via Payload local API
  await payload.update({
    collection: 'delivery-partners',
    id: profileId,
    data: {
      approvalStatus: 'approved',
    },
    overrideAccess: true,
  })

  // 12. Verify status approved is returned with token
  const verifyApprovedRes = await apiRequest('/api/mobile/auth/otp/verify', 'POST', {
    mobileNumber: testMobile,
    code: testOtp,
    role: 'delivery_partner',
  })
  report.assert(
    'Verify OTP for approved delivery partner profile returns status approved and JWT token',
    verifyApprovedRes.status === 200 &&
      verifyApprovedRes.body?.status === 'approved' &&
      typeof verifyApprovedRes.body?.token === 'string',
    'Best Case',
    `Expected status approved and token, got status ${verifyApprovedRes.body?.status}`
  )
}
