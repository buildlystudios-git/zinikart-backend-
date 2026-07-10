import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'
import { assignDeliveryPartnerTask } from '../../src/jobs/assignDeliveryPartner'
import { processRazorpayRefundTask } from '../../src/jobs/processRazorpayRefund'
import { checkOfferTimeoutTask } from '../../src/jobs/checkOfferTimeout'

export async function runQuickCommerceTests(
  report: ReportManager,
  payload: Payload,
  adminToken: string,
  retailerToken: string,
  customerToken: string,
  deliveryPartnerToken: string
) {
  report.setSuite('Quick Commerce Backend')
  console.log('\nRunning Quick Commerce Backend tests...')

  try {
    // 1. Setup Test Data
    const qUserEmails = ['other.retailer@testing.local', 'dp@test.local', 'dp2@test.local']
    const existingQUsers = await payload.find({
      collection: 'users',
      where: { email: { in: qUserEmails } },
      overrideAccess: true,
    })
    for (const u of existingQUsers.docs) {
      // Delete associated profiles first to avoid constraint errors
      await payload.delete({ collection: 'delivery-partners', where: { user: { equals: u.id } }, overrideAccess: true })
      await payload.delete({ collection: 'retailers', where: { user: { equals: u.id } }, overrideAccess: true })
      await payload.delete({ collection: 'users', id: u.id, overrideAccess: true })
    }
    const retailerUserRes = await apiRequest('/api/users/me', 'GET', null, retailerToken)
    const retailerId = retailerUserRes.body?.user?.id

    const otherRetailerUser = await payload.create({
      collection: 'users',
      data: {
        email: 'other.retailer@testing.local',
        mobileNumber: '+919900000000',
        password: 'password123',
        roles: ['retailer'],
      } as any,
      overrideAccess: true,
    })

    const timestamp = Date.now()

    const mockMedia = await payload.create({
      collection: 'media',
      data: { alt: 'Mock' } as any,
      file: { name: `mock-${timestamp}.pdf`, data: Buffer.from('mock'), mimetype: 'application/pdf', size: 4 },
      overrideAccess: true,
    })

    const otherRetailerProfile = await payload.create({
      collection: 'retailers',
      data: { 
        user: otherRetailerUser.id, 
        name: 'Other Retailer',
        shopName: 'Other Shop',
        ownerName: 'Other Owner',
        mobileNumber: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        emailId: 'other.shop@test.local',
        gstNumber: 'GSTIN123456789',
        images: [mockMedia.id],
        shopAddress: {
          street: '123 Main St',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
        },
        paymentMethods: [
          {
            methodType: 'bank_account',
            isDefault: true,
            accountHolderName: 'Owner Name',
            accountNumber: '1234567890',
            ifscCode: 'IFSC1234',
            bankName: 'Test Bank',
          },
        ],
        businessHours: {
          startTime: '09:00',
          endTime: '18:00',
        },
      } as any,
      overrideAccess: true
    })
    
    // We need to generate a token for otherRetailerUser to test access control
    const otherRetailerLoginRes = await apiRequest('/api/users/login', 'POST', {
      email: 'other.retailer@testing.local',
      password: 'password123'
    })
    const otherRetailerToken = otherRetailerLoginRes.body?.token

    const product1 = await payload.create({
      collection: 'products',
      data: { title: 'Product 1', retailer: retailerId, slug: `product-1-${timestamp}`, _status: 'published', inventory: 100 } as any,
      overrideAccess: true,
    })

    const product2 = await payload.create({
      collection: 'products',
      data: { title: 'Product 2', retailer: otherRetailerUser.id, slug: `product-2-${timestamp}`, _status: 'published', inventory: 100 } as any,
      overrideAccess: true,
    })

    const deliveryPartner = await payload.create({
      collection: 'delivery-partners',
      data: {
        user: retailerUserRes.body?.user?.id, // Mocking: using retailer user as DP for convenience in some tests
        fullName: 'Test DP',
        mobileNumber: '+911234567890',
        email: 'dp@test.local',
        gender: 'male',
        dob: '1990-01-01',
        drivingLicense: mockMedia.id,
        drivingLicenseNumber: 'DL-123',
        pancardNumber: 'PAN-123',
        pancardImage: mockMedia.id,
        vehicleBrand: 'Honda',
        vehicleRegistrationNumber: 'KA-01-1234',
        selfieImage: mockMedia.id,
        vehicleType: 'bike',
        paymentMethods: [
          {
            methodType: 'bank_account',
            isDefault: true,
            accountHolderName: 'DP',
            accountNumber: '123',
            ifscCode: 'IFSC123',
            bankName: 'Bank',
          },
        ],
        lat: 12.9716,
        lng: 77.5946,
        onlineStatus: true,
        approvalStatus: 'approved',
      } as any,
      overrideAccess: true,
    })

    const dp2User = await payload.create({
      collection: 'users',
      data: {
        email: 'dp2@test.local',
        mobileNumber: '+919900000002',
        password: 'password123',
        roles: ['delivery_partner'],
      } as any,
      overrideAccess: true,
    })
    
    const dp2LoginRes = await apiRequest('/api/users/login', 'POST', {
      email: 'dp2@test.local',
      password: 'password123'
    })
    const dp2Token = dp2LoginRes.body?.token

    const deliveryPartner2 = await payload.create({
      collection: 'delivery-partners',
      data: {
        user: dp2User.id,
        fullName: 'Test DP 2',
        mobileNumber: '+919900000002',
        email: 'dp2@test.local',
        gender: 'male',
        dob: '1990-01-01',
        drivingLicense: mockMedia.id,
        drivingLicenseNumber: 'DL-124',
        pancardNumber: 'PAN-124',
        pancardImage: mockMedia.id,
        vehicleBrand: 'Honda',
        vehicleRegistrationNumber: 'KA-01-1235',
        selfieImage: mockMedia.id,
        vehicleType: 'bike',
        paymentMethods: [
          {
            methodType: 'bank_account',
            isDefault: true,
            accountHolderName: 'DP 2',
            accountNumber: '124',
            ifscCode: 'IFSC124',
            bankName: 'Bank',
          },
        ],
        lat: 12.9716,
        lng: 77.5946,
        onlineStatus: true,
        approvalStatus: 'approved',
      } as any,
      overrideAccess: true,
    })

    // 2. Test validateSingleVendor Hook
    console.log('  Testing Single Vendor Validation...')
    const customerUserRes = await apiRequest('/api/users/me', 'GET', null, customerToken)
    const customerId = customerUserRes.body?.user?.id

    const multiVendorOrderRes = await apiRequest('/api/orders', 'POST', {
      status: 'placed',
      amount: 1000,
      currency: 'INR',
      retailer: retailerId,
      customer: customerId,
      shippingAddress: { street: '1', city: 'A', state: 'B', zipCode: '111', country: 'IN', phone: '1' },
      items: [
        { product: product1.id, quantity: 1, price: 1000 },
        { product: product2.id, quantity: 1, price: 1000 }
      ]
    }, adminToken)
    
    report.assert(
      'Should fail when ordering from multiple retailers',
      multiVendorOrderRes.status === 400 && multiVendorOrderRes.body?.errors?.[0]?.message?.includes('single retailer'),
      'Impossible Scenario'
    )

    const singleVendorOrderRes = await apiRequest('/api/orders', 'POST', {
      status: 'placed',
      amount: 1000,
      currency: 'INR',
      retailer: retailerId,
      customer: customerId,
      shippingAddress: { street: '1', city: 'A', state: 'B', zipCode: '111', country: 'IN', phone: '1' },
      items: [
        { product: product1.id, quantity: 1, price: 1000 }
      ]
    }, adminToken)

    report.assert(
      'Should succeed when ordering from a single retailer',
      singleVendorOrderRes.status === 201,
      'Best Case'
    )

    let orderId = singleVendorOrderRes.body?.doc?.id
    
    // 3. Test Order Lifecycle & Status Logging
    console.log('  Testing Order Lifecycle Logging...')
    let order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true })
    
    report.assert(
      'Status History should contain "placed" on creation',
      order.statusHistory?.[0]?.status === 'placed',
      'Best Case'
    )

    // Retailer Access Control Test
    const otherRetailerAction = await apiRequest(`/api/orders/${orderId}/retailer-action`, 'POST', {
      action: 'accept'
    }, otherRetailerToken)
    
    report.assert(
      'Retailer action endpoint rejects non-owner retailer',
      otherRetailerAction.status === 403,
      'Impossible Scenario'
    )

    // Move to order_received
    await apiRequest(`/api/orders/${orderId}/retailer-action`, 'POST', {
      action: 'accept'
    }, retailerToken)

    order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true })
    report.assert(
      'Status History should contain "order_received"',
      order.statusHistory?.length === 2 && order.statusHistory[1].status === 'order_received',
      'Best Case'
    )

    // 4. Test Delivery Assignment Job
    console.log('  Testing Delivery Assignment & Action Endpoints...')
    await assignDeliveryPartnerTask({
      req: { payload } as any,
      input: { orderId: String(orderId) },
    } as any)

    order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true })
    report.assert(
      'Delivery Partner should be offered the order',
      typeof order.currentOfferedPartner === 'object' && order.currentOfferedPartner?.id === deliveryPartner.id && order.deliveryPartnerAcceptance === 'pending',
      'Best Case'
    )

    // Delivery Partner Ownership Test
    const dp2Action = await apiRequest(`/api/orders/${orderId}/delivery-action`, 'POST', {
      action: 'accept'
    }, dp2Token)

    // 409 because query fails to match currentOfferedPartner
    report.assert(
      'Delivery action endpoint rejects non-offered delivery partner',
      dp2Action.status === 409 || dp2Action.status === 403,
      'Impossible Scenario'
    )

    // Test Atomic Accept (Race Condition)
    // We fire two accepts simultaneously from the correct user
    const [accept1, accept2] = await Promise.all([
      apiRequest(`/api/orders/${orderId}/delivery-action`, 'POST', { action: 'accept' }, retailerToken),
      apiRequest(`/api/orders/${orderId}/delivery-action`, 'POST', { action: 'accept' }, retailerToken)
    ])

    const successCount = (accept1.status === 200 ? 1 : 0) + (accept2.status === 200 ? 1 : 0)
    report.assert(
      'Atomic accept prevents race conditions (only 1 succeeds)',
      successCount === 1,
      'Best Case'
    )

    // 5. Handover OTP Validations via REST (status-update)
    console.log('  Testing Handover OTP Validations via REST...')
    
    // Attempt pickup without OTP
    const pickupNoOtp = await apiRequest(`/api/orders/${orderId}/status-update`, 'POST', {
      status: 'picked_up'
    }, adminToken) 

    report.assert(
      'Cannot pick up without OTP via REST',
      pickupNoOtp.status === 400 && (pickupNoOtp.body?.reason?.includes('OTP') || pickupNoOtp.body?.errors?.[0]?.message?.includes('OTP')),
      'Impossible Scenario'
    )
    
    // First refresh order to get the OTP
    order = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true })
    
    const pickupWithOtp = await apiRequest(`/api/orders/${orderId}/status-update`, 'POST', {
      status: 'picked_up',
      pickupOTP: order.pickupOTP
    }, retailerToken) // Using retailer token as DP for this test

    report.assert('Can pick up with correct OTP via REST endpoint', pickupWithOtp.status === 200, 'Best Case')

    const deliverWrongOtp = await apiRequest(`/api/orders/${orderId}/status-update`, 'POST', {
      status: 'delivered',
      deliveryOTP: '000000'
    }, retailerToken)
    
    report.assert('Cannot deliver with wrong OTP via REST endpoint', deliverWrongOtp.status === 400, 'Impossible Scenario')

    // 6. Test Unassignable Fallback
    console.log('  Testing Unassignable Fallback...')
    const unassignableOrderRes = await apiRequest('/api/orders', 'POST', {
      items: [
        { product: product1.id, quantity: 1 }
      ]
    }, customerToken)
    
    const unassignableOrderId = unassignableOrderRes.body?.doc?.id
    await payload.update({
      collection: 'orders',
      id: unassignableOrderId,
      data: { status: 'order_received' },
      overrideAccess: true,
    })

    // Reject all candidates manually for this order
    await payload.update({
      collection: 'orders',
      id: unassignableOrderId,
      data: { rejectedDeliveryPartners: [deliveryPartner.id, deliveryPartner2.id] },
      overrideAccess: true
    })

    await assignDeliveryPartnerTask({
      req: { payload } as any,
      input: { orderId: String(unassignableOrderId) },
    } as any)

    const unassignableOrder = await payload.findByID({ collection: 'orders', id: unassignableOrderId, overrideAccess: true })
    report.assert(
      'Order becomes unassignable when no riders are available',
      unassignableOrder.deliveryPartnerAcceptance === 'unassignable',
      'Best Case'
    )

    // 7. Test Location Throttling
    console.log('  Testing Location Throttling...')
    const loc1 = await apiRequest('/api/delivery-partners/location', 'PATCH', { lat: 12.0, lng: 77.0 }, dp2Token)
    const loc2 = await apiRequest('/api/delivery-partners/location', 'PATCH', { lat: 12.1, lng: 77.1 }, dp2Token)
    
    report.assert(
      'Second rapid location update should be throttled (429)',
      loc1.status === 200 && loc2.status === 429,
      'Best Case'
    )

    // Cleanup
    await payload.delete({ collection: 'users', id: otherRetailerUser.id, overrideAccess: true })
    await payload.delete({ collection: 'users', id: dp2User.id, overrideAccess: true })
    await payload.delete({ collection: 'products', where: { id: { in: [product1.id, product2.id] } }, overrideAccess: true })
    await payload.delete({ collection: 'delivery-partners', id: deliveryPartner.id, overrideAccess: true })
    await payload.delete({ collection: 'delivery-partners', id: deliveryPartner2.id, overrideAccess: true })
    await payload.delete({ collection: 'retailers', id: otherRetailerProfile.id, overrideAccess: true })
    await payload.delete({ collection: 'orders', id: orderId, overrideAccess: true })
    await payload.delete({ collection: 'orders', id: unassignableOrderId, overrideAccess: true })

  } catch (err: any) {
    console.error('Quick Commerce Tests Failed:', err)
    report.assert(`Suite completed without unhandled exceptions: ${err.message}`, false, 'Impossible Scenario')
  }
}
