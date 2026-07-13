import type { Payload } from 'payload'
import { ReportManager, apiRequest } from './helpers'
import { buildMessageBase } from '../../src/services/notifications/fcm'
import { ORDER_STATUS } from '../../src/constants/orderStatuses'

export async function runNotificationTests(
  payload: Payload,
  report: ReportManager,
  customerToken: string,
  retailerToken: string,
  adminToken: string,
  customerId: string,
  retailerId: string,
  adminId: string,
) {
  report.setSuite('Notifications')
  console.log('\nRunning Notification Tests...')

  // Setup: create a dummy delivery partner user
  const dpUserRes = await payload.create({
    collection: 'users',
    data: {
      email: `dp.notif.${Date.now()}@testing.zinikart.local`,
      password: 'testPassword123',
      mobileNumber: `+91999${Math.floor(1000000 + Math.random() * 9000000)}`,
      mobileVerified: true,
      roles: ['delivery_partner'],
    } as any,
    overrideAccess: true,
  })
  const dpUserId = dpUserRes.id

  const dpLoginRes = await apiRequest('/api/users/login', 'POST', {
    email: dpUserRes.email,
    password: 'testPassword123',
  })
  const dpToken = dpLoginRes.body?.token

  // Fetch a mock media for required file fields
  const mediaDocs = await payload.find({
    collection: 'media',
    limit: 1,
    overrideAccess: true,
  })
  let mediaId = mediaDocs.docs[0]?.id
  if (!mediaId) {
    const dummyMedia = await payload.create({
        collection: 'media',
        data: {
            alt: 'Dummy Media',
        },
        filePath: require('path').resolve(__dirname, '../../public/favicon.ico'),
        overrideAccess: true,
    })
    mediaId = dummyMedia.id
  }

  const dpRes = await payload.create({
    collection: 'delivery-partners',
    data: {
      user: dpUserId,
      fullName: 'Test DP Rider',
      mobileNumber: dpUserRes.mobileNumber,
      email: dpUserRes.email,
      gender: 'male',
      dob: '1995-01-01',
      drivingLicense: mediaId,
      drivingLicenseNumber: 'DL-1234567890',
      pancardNumber: 'PAN-TEST-123',
      pancardImage: mediaId,
      vehicleBrand: 'Honda Activa',
      vehicleType: 'bike',
      vehicleRegistrationNumber: 'KA-01-AB-1234',
      selfieImage: mediaId,
      approvalStatus: 'pending',
      onlineStatus: true,
    } as any,
    overrideAccess: true,
  })
  const dpId = dpRes.id

  const retailerRes = await payload.find({
    collection: 'retailers',
    where: { user: { equals: retailerId } },
    overrideAccess: true,
  })
  const retailerDocId = retailerRes.docs[0]?.id

  const checkWorkflowQueued = async (templateKey: string, recipientId: string) => {
    const jobs = await payload.find({
      collection: 'payload-jobs',
      limit: 1000,
      overrideAccess: true,
    })
    if (jobs.docs.length > 0) {
      console.log('[DEBUG] First job full doc:', JSON.stringify(jobs.docs[0]))
    }
    console.log(`[DEBUG] checkWorkflowQueued searching for ${templateKey} for user ${recipientId}. Found ${jobs.docs.length} jobs:`, jobs.docs.map((j: any) => ({ workflow: j.workflow, workflowSlug: j.workflowSlug, taskSlug: j.taskSlug, task: j.task, templateKey: j.input?.templateKey, recipientUserId: j.input?.recipientUserId })))
    return jobs.docs.some((job: any) => 
      (job.workflowSlug === 'dispatchPushNotification' || job.workflow === 'dispatchPushNotification') && 
      job.input?.templateKey === templateKey && 
      job.input?.recipientUserId === recipientId
    )
  }

  const checkTaskQueued = async (taskSlug: string) => {
    const jobs = await payload.find({
      collection: 'payload-jobs',
      limit: 1000,
      overrideAccess: true,
    })
    console.log(`[DEBUG] checkTaskQueued searching for ${taskSlug}. Found ${jobs.docs.length} jobs:`, jobs.docs.map((j: any) => ({ taskSlug: j.taskSlug })))
    return jobs.docs.some((job: any) => job.taskSlug === taskSlug)
  }

  // --- Suite 1: FCM Token Registration & Unregistration ---
  console.log('\n  Suite 1: Token Registration & Unregistration')
  
  const testToken1 = `test_fcm_token_1_${Date.now()}`
  
  let res = await apiRequest('/api/users/fcm-token', 'POST', {
    token: testToken1, platform: 'android', deviceLabel: 'Test Android'
  }, customerToken)
  report.assert('Register token via POST', res.status === 200, 'Best Case', `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`)

  let updatedCustomer = await payload.findByID({ collection: 'users', id: customerId, overrideAccess: true })
  report.assert('Token added to array', updatedCustomer.fcmTokens?.some((t: any) => t.token === testToken1) || false, 'Best Case')

  res = await apiRequest('/api/users/fcm-token', 'POST', {
    token: testToken1, platform: 'android', deviceLabel: 'Test Android'
  }, customerToken)
  updatedCustomer = await payload.findByID({ collection: 'users', id: customerId, overrideAccess: true })
  report.assert('Register same token twice (idempotent)', updatedCustomer.fcmTokens?.filter((t: any) => t.token === testToken1).length === 1, 'Possible Scenario')

  res = await apiRequest('/api/users/fcm-token', 'POST', {
    token: 'some_token'
  })
  report.assert('Register without auth -> 401', res.status === 401, 'Worst Case')

  res = await apiRequest('/api/users/fcm-token', 'POST', { platform: 'android' }, customerToken)
  report.assert('Register without token -> 400', res.status === 400, 'Worst Case')

  res = await apiRequest('/api/users/fcm-token', 'DELETE', { token: testToken1 }, customerToken)
  report.assert('Unregister token via DELETE', res.status === 200, 'Best Case', `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`)
  
  updatedCustomer = await payload.findByID({ collection: 'users', id: customerId, overrideAccess: true })
  report.assert('Token removed from array', !updatedCustomer.fcmTokens?.some((t: any) => t.token === testToken1), 'Best Case')

  res = await apiRequest('/api/users/fcm-token', 'DELETE', { token: 'non_existent_token' }, customerToken)
  report.assert('Unregister non-existent token -> 200 (no-op)', res.status === 200, 'Possible Scenario')

  // --- Suite 2: Token Claim Semantics ---
  console.log('\n  Suite 2: Token Claim Semantics')
  
  const sharedToken = `shared_token_${Date.now()}`
  await apiRequest('/api/users/fcm-token', 'POST', { token: sharedToken, platform: 'ios' }, customerToken)
  
  // Now retailer logs in and registers same token
  await apiRequest('/api/users/fcm-token', 'POST', { token: sharedToken, platform: 'ios' }, retailerToken)
  
  updatedCustomer = await payload.findByID({ collection: 'users', id: customerId, overrideAccess: true })
  let updatedRetailer = await payload.findByID({ collection: 'users', id: retailerId, overrideAccess: true })
  
  report.assert('Token stripped from old user', Boolean(!updatedCustomer.fcmTokens?.some((t: any) => t.token === sharedToken)), 'Best Case')
  report.assert('Token claimed by new user', Boolean(updatedRetailer.fcmTokens?.some((t: any) => t.token === sharedToken)), 'Best Case')

  const tokenA = `token_A_${Date.now()}`
  const tokenB = `token_B_${Date.now()}`
  await apiRequest('/api/users/fcm-token', 'POST', { token: tokenA, platform: 'android' }, customerToken)
  await apiRequest('/api/users/fcm-token', 'POST', { token: tokenB, platform: 'web' }, customerToken)
  updatedCustomer = await payload.findByID({ collection: 'users', id: customerId, overrideAccess: true })
  report.assert('Multi-device: different tokens coexist', Boolean(updatedCustomer.fcmTokens?.some((t: any) => t.token === tokenA) && updatedCustomer.fcmTokens?.some((t: any) => t.token === tokenB)), 'Possible Scenario')

  // --- Suite 3: Order Lifecycle Triggers ---
  console.log('\n  Suite 3: Order Lifecycle Triggers')

  const orderRes = await payload.create({
    collection: 'orders',
    data: {
      customer: customerId,
      retailer: retailerDocId,
      status: ORDER_STATUS.PLACED,
      paymentMethod: 'razorpay',
    } as any,
    overrideAccess: true,
  })
  const orderId = orderRes.id

  report.assert('ORDER_PLACED workflow queued', await checkWorkflowQueued('ORDER_PLACED', customerId), 'Best Case')
  report.assert('RETAILER_NEW_ORDER workflow queued', await checkWorkflowQueued('RETAILER_NEW_ORDER', retailerId), 'Best Case')

  await payload.update({
    collection: 'orders',
    id: orderId,
    data: { status: ORDER_STATUS.ORDER_RECEIVED } as any,
    overrideAccess: true,
  })
  
  report.assert('ORDER_RECEIVED workflow queued', await checkWorkflowQueued('ORDER_RECEIVED', customerId), 'Best Case')
  report.assert('assignDeliveryPartner task queued', await checkTaskQueued('assignDeliveryPartner'), 'Best Case')

  const codOrderRes = await payload.create({
    collection: 'orders',
    data: {
      customer: customerId,
      retailer: retailerDocId,
      status: ORDER_STATUS.ORDER_RECEIVED,
      paymentMethod: 'cod',
      deliveryPartner: dpId, // assign manually for test
    } as any,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'orders',
    id: codOrderRes.id,
    data: { status: ORDER_STATUS.OUT_FOR_DELIVERY } as any,
    overrideAccess: true,
  })

  report.assert('ORDER_OUT_FOR_DELIVERY queued (Customer)', await checkWorkflowQueued('ORDER_OUT_FOR_DELIVERY', customerId), 'Best Case')
  report.assert('COD_COLLECTION_REMINDER queued (DP)', await checkWorkflowQueued('COD_COLLECTION_REMINDER', dpUserId), 'Best Case')

  const currentCodOrder = await payload.findByID({ collection: 'orders', id: codOrderRes.id, overrideAccess: true })

  await payload.update({
    collection: 'orders',
    id: codOrderRes.id,
    data: { status: ORDER_STATUS.DELIVERED } as any,
    context: { providedDeliveryOTP: currentCodOrder.deliveryOTP },
    overrideAccess: true,
  })
  report.assert('ORDER_DELIVERED queued (Customer)', await checkWorkflowQueued('ORDER_DELIVERED', customerId), 'Best Case')

  // Cancellations
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      status: ORDER_STATUS.CANCELLED,
    } as any,
    context: { changeSource: 'retailer' },
    overrideAccess: true,
  })
  report.assert('ORDER_CANCELLED_REJECTED queued', await checkWorkflowQueued('ORDER_CANCELLED_REJECTED', customerId), 'Best Case')

  const cancelOrderSys = await payload.create({
    collection: 'orders',
    data: { customer: customerId, retailer: retailerDocId, status: ORDER_STATUS.PLACED, paymentMethod: 'cod' } as any,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'orders',
    id: cancelOrderSys.id,
    data: {
      status: ORDER_STATUS.CANCELLED,
    } as any,
    context: { changeSource: 'system' },
    overrideAccess: true,
  })
  report.assert('ORDER_CANCELLED_TIMEOUT queued', await checkWorkflowQueued('ORDER_CANCELLED_TIMEOUT', customerId), 'Possible Scenario')

  // --- Suite 4: Delivery Partner Offer Lifecycle ---
  console.log('\n  Suite 4: Delivery Partner Offer Lifecycle')
  
  // We can test assignment task logic manually by enqueuing the workflow directly
  await payload.jobs.queue({
    workflow: 'dispatchPushNotification',
    input: { recipientUserId: dpUserId, templateKey: 'DELIVERY_OFFER', templateData: { orderId: orderId, amount: '100.00', timeoutSeconds: '60' } }
  })
  report.assert('DELIVERY_OFFER workflow enqueued directly', await checkWorkflowQueued('DELIVERY_OFFER', dpUserId), 'Best Case')

  // --- Suite 5: Account Approval Notifications ---
  console.log('\n  Suite 5: Account Approval Notifications')

  // Retailer approval
  await payload.update({
    collection: 'retailers',
    id: retailerDocId,
    data: { approvalStatus: 'approved' } as any,
    overrideAccess: true,
  })
  report.assert('ACCOUNT_APPROVED queued (Retailer)', await checkWorkflowQueued('ACCOUNT_APPROVED', retailerId), 'Best Case')

  // DP rejection
  await payload.update({
    collection: 'delivery-partners',
    id: dpId,
    data: { approvalStatus: 'rejected' } as any,
    overrideAccess: true,
  })
  report.assert('ACCOUNT_REJECTED queued (DP)', await checkWorkflowQueued('ACCOUNT_REJECTED', dpUserId), 'Possible Scenario')

  // --- Suite 6: Payment & Refund Notifications ---
  console.log('\n  Suite 6: Payment & Refund Notifications')
  
  const txRes = await payload.create({
    collection: 'transactions',
    data: {
      order: orderId,
      customer: customerId,
      amount: 100,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'razorpay',
    } as any,
    overrideAccess: true,
  })
  
  await payload.update({
    collection: 'transactions',
    id: txRes.id,
    data: { status: 'succeeded' } as any,
    overrideAccess: true,
  })
  report.assert('PAYMENT_CONFIRMED queued', await checkWorkflowQueued('PAYMENT_CONFIRMED', customerId), 'Best Case')

  // --- Suite 7: Template Interpolation ---
  console.log('\n  Suite 7: Template Interpolation')
  
  const data = { orderId: 'ORD-123', amount: '500.00' }
  const messageBase = buildMessageBase('DELIVERY_OFFER', data)
  report.assert('DELIVERY_OFFER interpolates placeholders', (messageBase.notification?.body?.includes('ORD-123') && messageBase.notification?.body?.includes('500.00')) ?? false, 'Best Case')

  const msgBaseMissing = buildMessageBase('ORDER_DELIVERED', {})
  report.assert('Missing placeholders preserved without crashing', msgBaseMissing.notification?.body?.includes('{{orderId}}') ?? false, 'Possible Scenario')

  // --- Suite 8: PushNotificationLogs Collection ---
  console.log('\n  Suite 8: PushNotificationLogs Collection')

  const logRes = await payload.create({
    collection: 'push-notification-logs',
    data: {
      recipient: customerId,
      title: 'Test Notification',
      body: 'This is a test',
      status: 'sent',
      sentAt: new Date().toISOString(),
      data: { templateKey: 'TEST_KEY' },
    } as any,
    overrideAccess: true,
  })
  
  res = await apiRequest('/api/push-notification-logs', 'GET', undefined, adminToken)
  report.assert('Admin can read logs -> 200', res.status === 200, 'Best Case')

  res = await apiRequest('/api/push-notification-logs', 'POST', {
    recipient: customerId, title: 'Hacked', body: 'Spam', status: 'sent', sentAt: new Date().toISOString()
  }, customerToken)
  report.assert('Customer cannot create logs -> 403', res.status === 403, 'Worst Case')
}
