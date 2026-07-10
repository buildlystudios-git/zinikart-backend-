import { ReportManager, apiRequest } from './helpers'
import crypto from 'crypto'
import type { Payload } from 'payload'

export async function runCheckoutTests(
  report: ReportManager,
  payload: Payload,
  customerToken: string
) {
  report.setSuite('Checkout & Payments')
  console.log('\nRunning Checkout & Payments tests...')

  // Step 0: Setup checks
  if (!customerToken) {
    report.assert('Checkout tests setup failed: missing customerToken', false, 'Best Case')
    return
  }

  // Find a cloned product to buy
  const clonedProducts = await payload.find({
    collection: 'products',
    where: {
      isMasterTemplate: { equals: false },
      enableVariants: { not_equals: true },
      priceInINR: { greater_than: 0 },
    },
    limit: 1,
    overrideAccess: true,
  })
  const product = clonedProducts.docs[0]

  if (!product) {
    report.assert('Checkout tests setup failed: no cloned products found in database', false, 'Best Case')
    return
  }

  // 1. Get or Create Cart and ensure it has items
  let cartID: any = null
  const getCartsRes = await apiRequest('/api/carts', 'GET', null, customerToken)
  
  if (getCartsRes.status === 200 && getCartsRes.body?.docs?.length > 0) {
    cartID = getCartsRes.body.docs[0].id
  } else {
    // Get logged-in user details to associate the cart with the customer
    const meRes = await apiRequest('/api/users/me', 'GET', null, customerToken)
    const customerId = meRes.body?.user?.id

    // Attempt to create a cart
    const createCartRes = await apiRequest('/api/carts', 'POST', { customer: customerId }, customerToken)
    cartID = createCartRes.body?.doc?.id
  }

  if (!cartID) {
    report.assert('Checkout tests setup failed: could not retrieve or create cart', false, 'Best Case')
    return
  }

  // Add the product to cart
  const addRes = await apiRequest(
    `/api/carts/${cartID}/add-item`,
    'POST',
    {
      item: { product: product.id },
      quantity: 1,
    },
    customerToken
  )

  if (addRes.status !== 200 && addRes.status !== 201) {
    report.assert('Checkout tests setup failed: could not add item to cart', false, 'Best Case', `Status: ${addRes.status}, Body: ${JSON.stringify(addRes.body)}`)
    return
  }

  const address = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Test St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
    lat: 19.0760,
    lng: 72.8777,
  }

  // 2. Initiate Razorpay Payment
  const initiateRes = await apiRequest(
    '/api/payments/razorpay/initiate',
    'POST',
    {
      cartID,
      billingAddress: address,
      shippingAddress: address,
    },
    customerToken
  )

  const razorpayOrderID = initiateRes.body?.razorpayOrderID
  const transactionID = initiateRes.body?.transactionID

  report.assert(
    'Successfully initiate payment via Razorpay adapter (returns status 200 or 201 and a razorpayOrderID)',
    (initiateRes.status === 200 || initiateRes.status === 201) && !!razorpayOrderID,
    'Best Case',
    `Expected status 200/201 and razorpayOrderID. Got status: ${initiateRes.status}, Body: ${JSON.stringify(initiateRes.body)}`
  )

  // 3. Confirm Razorpay Order
  const keySecret = process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock'
  const mockPaymentID = 'pay_mock_payment_id'
  const mockSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderID || 'mock_order_id'}|${mockPaymentID}`)
    .digest('hex')

  const confirmRes = await apiRequest(
    '/api/payments/razorpay/confirm-order',
    'POST',
    {
      cartID,
      razorpayOrderID: razorpayOrderID || 'mock_order_id',
      razorpayPaymentID: mockPaymentID,
      razorpaySignature: mockSignature,
      billingAddress: address,
      shippingAddress: address,
    },
    customerToken
  )

  const orderID = confirmRes.body?.orderID || confirmRes.body?.order?.id

  report.assert(
    'Successfully confirm order and generate Order ID (returns status 200 or 201)',
    (confirmRes.status === 200 || confirmRes.status === 201) && !!orderID,
    'Best Case',
    `Expected status 200/201 and orderID. Got status: ${confirmRes.status}, Body: ${JSON.stringify(confirmRes.body)}`
  )

  // --- IMPOSSIBLE & SECURITY SCENARIOS ---

  // 4. Initiate payment without auth token
  const initiateNoAuthRes = await apiRequest(
    '/api/payments/razorpay/initiate',
    'POST',
    {
      cartID,
      billingAddress: address,
      shippingAddress: address,
    },
    ''
  )
  report.assert(
    'Attempt to initiate payment without auth token is rejected (returns 400, 401, or 403)',
    initiateNoAuthRes.status === 400 || initiateNoAuthRes.status === 401 || initiateNoAuthRes.status === 403,
    'Impossible Scenario',
    `Expected status 400/401/403, got status: ${initiateNoAuthRes.status}, Body: ${JSON.stringify(initiateNoAuthRes.body)}`
  )

  const initiateInvalidCartRes = await apiRequest(
    '/api/payments/razorpay/initiate',
    'POST',
    {
      cartID: '00000000-0000-0000-0000-999999999999', // non-existent UUID format
      billingAddress: address,
      shippingAddress: address,
    },
    customerToken
  )
  report.assert(
    'Attempt to initiate payment with non-existent cart ID is rejected (returns 400 or 404)',
    initiateInvalidCartRes.status === 400 || initiateInvalidCartRes.status === 404,
    'Impossible Scenario',
    `Expected status 400/404, got status: ${initiateInvalidCartRes.status}, Body: ${JSON.stringify(initiateInvalidCartRes.body)}`
  )

  // 6. Initiate payment with empty cart
  let emptyCartID: any = null
  let userB: any = null
  try {
    // Create another user B to hold an empty cart
    userB = await payload.create({
      collection: 'users',
      data: {
        email: 'userb.checkouttest@testing.zinikart.local',
        mobileNumber: '+915555555555',
        mobileVerified: true,
        password: 'password123',
        roles: ['customer'],
      } as any,
      overrideAccess: true,
    })

    const loginRes = await apiRequest('/api/users/login', 'POST', {
      email: 'userb.checkouttest@testing.zinikart.local',
      password: 'password123',
    })
    const tokenB = loginRes.body?.token

    if (!tokenB) {
      throw new Error('Failed to login User B in Checkout tests')
    }

    const createEmptyCartRes = await apiRequest('/api/carts', 'POST', { customer: userB.id }, tokenB)
    emptyCartID = createEmptyCartRes.body?.doc?.id

    if (!emptyCartID) {
      throw new Error('Failed to create empty cart for User B')
    }

    const initiateEmptyCartRes = await apiRequest(
      '/api/payments/razorpay/initiate',
      'POST',
      {
        cartID: emptyCartID,
        billingAddress: address,
        shippingAddress: address,
      },
      tokenB
    )
    report.assert(
      'Attempt to initiate payment with an empty cart is rejected (returns 400 or 500 with proper error)',
      initiateEmptyCartRes.status === 400 || initiateEmptyCartRes.status === 500,
      'Impossible Scenario',
      `Expected status 400/500, got status: ${initiateEmptyCartRes.status}, Body: ${JSON.stringify(initiateEmptyCartRes.body)}`
    )

    // 7. Worst Case: Cross-User payment access
    // Customer B attempts to initiate payment on Customer A's cart
    const initiateOtherCartRes = await apiRequest(
      '/api/payments/razorpay/initiate',
      'POST',
      {
        cartID,
        billingAddress: address,
        shippingAddress: address,
      },
      tokenB
    )
    report.assert(
      'Access Control: Customer B is blocked from initiating payment on Customer A\'s cart (returns 403 or 404)',
      initiateOtherCartRes.status === 403 || initiateOtherCartRes.status === 404,
      'Worst Case',
      `Expected status 403/404, got status: ${initiateOtherCartRes.status}, Body: ${JSON.stringify(initiateOtherCartRes.body)}`
    )

    // Customer B attempts to confirm order on Customer A's cart
    const confirmOtherCartRes = await apiRequest(
      '/api/payments/razorpay/confirm-order',
      'POST',
      {
        cartID,
        razorpayOrderID: razorpayOrderID || 'mock_order_id',
        razorpayPaymentID: mockPaymentID,
        razorpaySignature: mockSignature,
        billingAddress: address,
        shippingAddress: address,
      },
      tokenB
    )
    report.assert(
      'Access Control: Customer B is blocked from confirming order on Customer A\'s cart (returns 403 or 404)',
      confirmOtherCartRes.status === 403 || confirmOtherCartRes.status === 404,
      'Worst Case',
      `Expected status 403/404, got status: ${confirmOtherCartRes.status}, Body: ${JSON.stringify(confirmOtherCartRes.body)}`
    )

    // === CASH ON DELIVERY (COD) TESTS ===
    console.log('Running Cash on Delivery (COD) tests...')

    // Re-add product to cart for COD checkout
    const codCartRes = await apiRequest('/api/carts', 'GET', null, customerToken)
    let codCartID = codCartRes.body?.docs?.[0]?.id
    if (!codCartID || codCartRes.body?.docs?.[0]?.purchasedAt) {
      // Create new cart
      const meRes = await apiRequest('/api/users/me', 'GET', null, customerToken)
      const customerId = meRes.body?.user?.id
      const createCartRes = await apiRequest('/api/carts', 'POST', { customer: customerId }, customerToken)
      codCartID = createCartRes.body?.doc?.id
    }

    // Add item
    const codAddRes = await apiRequest(
      `/api/carts/${codCartID}/add-item`,
      'POST',
      {
        item: { product: product.id },
        quantity: 1,
      },
      customerToken
    )
    report.assert(
      'COD setup: Item added to cart',
      codAddRes.status === 200 || codAddRes.status === 201,
      'Best Case'
    )

    // 1. Initiate COD Payment
    const codInitiateRes = await apiRequest(
      '/api/payments/cod/initiate',
      'POST',
      {
        cartID: codCartID,
        billingAddress: address,
        shippingAddress: address,
      },
      customerToken
    )
    const codTxID = codInitiateRes.body?.transactionID
    report.assert(
      'Successfully initiate payment via COD adapter (returns transactionID)',
      (codInitiateRes.status === 200 || codInitiateRes.status === 201) && !!codTxID,
      'Best Case',
      `Got status: ${codInitiateRes.status}, Body: ${JSON.stringify(codInitiateRes.body)}`
    )

    // 2. Confirm COD Order
    const codConfirmRes = await apiRequest(
      '/api/payments/cod/confirm-order',
      'POST',
      {
        cartID: codCartID,
        transactionID: codTxID,
        billingAddress: address,
        shippingAddress: address,
      },
      customerToken
    )
    const codOrderID = codConfirmRes.body?.orderID
    report.assert(
      'Successfully confirm COD order (returns orderID)',
      (codConfirmRes.status === 200 || codConfirmRes.status === 201) && !!codOrderID,
      'Best Case',
      `Got status: ${codConfirmRes.status}, Body: ${JSON.stringify(codConfirmRes.body)}`
    )

    // 3. Create Delivery Partner user A & B
    const randA = crypto.randomBytes(4).toString('hex')
    const randB = crypto.randomBytes(4).toString('hex')
    const mobileA = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
    const mobileB = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
    const emailA = `delivery.a.${randA}@testing.zinikart.local`
    const emailB = `delivery.b.${randB}@testing.zinikart.local`

    // Fetch a valid media ID to satisfy foreign key constraint
    const mediaRes = await payload.find({
      collection: 'media',
      limit: 1,
      overrideAccess: true,
    })
    const validMediaId = mediaRes.docs[0]?.id
    if (!validMediaId) {
      throw new Error('No media records found in database for checkout tests setup')
    }

    const deliveryUserA = await payload.create({
      collection: 'users',
      data: {
        email: emailA,
        mobileNumber: mobileA,
        mobileVerified: true,
        password: 'password123',
        roles: ['delivery_partner'],
      } as any,
      overrideAccess: true,
    })

    const deliveryPartnerProfileA = await payload.create({
      collection: 'delivery-partners',
      data: {
        fullName: 'Delivery Partner A',
        mobileNumber: mobileA,
        email: emailA,
        gender: 'male',
        dob: '1990-01-01',
        drivingLicense: validMediaId,
        drivingLicenseNumber: 'DL-A',
        pancardNumber: 'PAN-A',
        pancardImage: validMediaId,
        vehicleBrand: 'Honda',
        vehicleRegistrationNumber: 'REG-A',
        selfieImage: validMediaId,
        paymentMethods: [
          {
            methodType: 'bank_account',
            isDefault: true,
            accountHolderName: 'Delivery Partner A',
            accountNumber: '111111111',
            ifscCode: 'IFSC0001111',
            bankName: 'Test Bank A',
          },
        ],
        vehicleType: 'bike',
        approvalStatus: 'approved',
        onlineStatus: true,
        user: deliveryUserA.id,
      } as any,
      overrideAccess: true,
    })

    const deliveryUserB = await payload.create({
      collection: 'users',
      data: {
        email: emailB,
        mobileNumber: mobileB,
        mobileVerified: true,
        password: 'password123',
        roles: ['delivery_partner'],
      } as any,
      overrideAccess: true,
    })

    const deliveryPartnerProfileB = await payload.create({
      collection: 'delivery-partners',
      data: {
        fullName: 'Delivery Partner B',
        mobileNumber: mobileB,
        email: emailB,
        gender: 'female',
        dob: '1991-01-01',
        drivingLicense: validMediaId,
        drivingLicenseNumber: 'DL-B',
        pancardNumber: 'PAN-B',
        pancardImage: validMediaId,
        vehicleBrand: 'Yamaha',
        vehicleRegistrationNumber: 'REG-B',
        selfieImage: validMediaId,
        paymentMethods: [
          {
            methodType: 'bank_account',
            isDefault: true,
            accountHolderName: 'Delivery Partner B',
            accountNumber: '222222222',
            ifscCode: 'IFSC0002222',
            bankName: 'Test Bank B',
          },
        ],
        vehicleType: 'bike',
        approvalStatus: 'approved',
        onlineStatus: true,
        user: deliveryUserB.id,
      } as any,
      overrideAccess: true,
    })

    if (codOrderID) {
      // Assign Delivery Partner A to the order
      await payload.update({
        collection: 'orders',
        id: codOrderID,
        data: {
          deliveryPartner: deliveryPartnerProfileA.id,
        },
        overrideAccess: true,
      })
    }

    // Login both delivery partners to get their tokens
    const loginARes = await apiRequest('/api/users/login', 'POST', {
      email: emailA,
      password: 'password123',
    })
    const tokenA = loginARes.body?.token

    const loginBRes = await apiRequest('/api/users/login', 'POST', {
      email: emailB,
      password: 'password123',
    })
    const tokenB2 = loginBRes.body?.token

    // 4. Test Cross-partner update protection (Partner B tries to update Order assigned to Partner A)
    const updateByPartnerBRes = await apiRequest(
      `/api/orders/${codOrderID}`,
      'PATCH',
      {
        status: 'cod_payment_received',
      },
      tokenB2
    )
    report.assert(
      'Access Control: Unassigned delivery partner is blocked from updating the order (returns 403 or 404)',
      updateByPartnerBRes.status === 403 || updateByPartnerBRes.status === 404,
      'Worst Case',
      `Got status: ${updateByPartnerBRes.status}, Body: ${JSON.stringify(updateByPartnerBRes.body)}`
    )

    // 5. Test Field Restriction (Partner A tries to update status AND hijack/change order amount)
    const originalOrder = await payload.findByID({
      collection: 'orders',
      id: codOrderID,
      overrideAccess: true,
    })
    const hijackedAmount = 100 // 1 INR in Paise

    const updateAttemptRes = await apiRequest(
      `/api/orders/${codOrderID}`,
      'PATCH',
      {
        status: 'cod_payment_received',
        amount: hijackedAmount, // this should be ignored/reverted
        codCollectionRecord: {
          paymentType: 'qr',
        },
      },
      tokenA
    )

    report.assert(
      'Assigned delivery partner can successfully change order status',
      updateAttemptRes.status === 200 || updateAttemptRes.status === 201,
      'Best Case',
      `Got status: ${updateAttemptRes.status}`
    )

    // Verify order fields in database
    const updatedOrder = await payload.findByID({
      collection: 'orders',
      id: codOrderID,
      overrideAccess: true,
    })

    report.assert(
      'Order status is successfully set to cod_payment_received',
      updatedOrder.status === 'cod_payment_received',
      'Best Case'
    )

    report.assert(
      'Security: Order amount was NOT hijacked and remained original',
      updatedOrder.amount === originalOrder.amount,
      'Worst Case',
      `Expected amount: ${originalOrder.amount}, Got: ${updatedOrder.amount}`
    )

    // Check automated COD collection logging
    report.assert(
      'COD collection record status is updated to collected',
      updatedOrder.codCollectionRecord?.status === 'collected',
      'Best Case'
    )

    report.assert(
      'COD collection record paymentType is set to qr',
      updatedOrder.codCollectionRecord?.paymentType === 'qr',
      'Best Case'
    )

    const collectedByStr = typeof updatedOrder.codCollectionRecord?.collectedBy === 'object'
      ? updatedOrder.codCollectionRecord?.collectedBy?.id
      : updatedOrder.codCollectionRecord?.collectedBy
    report.assert(
      'COD collection record is stamped with correct delivery partner profile ID',
      collectedByStr === deliveryPartnerProfileA.id,
      'Best Case',
      `Expected: ${deliveryPartnerProfileA.id}, Got: ${collectedByStr}`
    )

    // Check that transaction status automatically transitioned to succeeded
    const finalTx = await payload.findByID({
      collection: 'transactions',
      id: codTxID,
      overrideAccess: true,
    })
    report.assert(
      'COD transaction automatically updated to status succeeded when order completed',
      finalTx.status === 'succeeded',
      'Best Case'
    )

    // Clean up COD test data
    await payload.delete({
      collection: 'delivery-partners',
      id: deliveryPartnerProfileA.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      id: deliveryUserA.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'delivery-partners',
      id: deliveryPartnerProfileB.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      id: deliveryUserB.id,
      overrideAccess: true,
    })

  } catch (err: any) {
    console.error('Error during cross-user checkout security tests:', err)
    report.assert('Cross-User checkout checks setup error', false, 'Worst Case', err.message)
  } finally {
    if (userB?.id) {
      await payload.delete({
        collection: 'users',
        id: userB.id,
        overrideAccess: true,
      })
    }
  }
}
