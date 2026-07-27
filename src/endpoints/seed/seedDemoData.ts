import type { Payload } from 'payload'
import { fetchFileByURL } from './utils'
import { ORDER_STATUS } from '@/constants/orderStatuses'

export async function seedDemoData(payload: Payload) {
  payload.logger.info(`— Seeding comprehensive demo data (Retailers, Delivery Partners, Products Inventory, Orders, Transactions, Ratings)...`)

  // 1. Clear existing demo collections to ensure a fresh dataset
  const collectionsToReset = ['ratings', 'transactions', 'orders', 'delivery-partners', 'retailers'] as const
  for (const collection of collectionsToReset) {
    try {
      await payload.delete({
        collection,
        where: { id: { exists: true } },
      })
    } catch (e) {
      // Ignore deletion errors for empty collections
    }
  }

  // 2. Ensure Media doc exists (Required for Retailers & Delivery Partners)
  let mediaId: string | number = ''
  try {
    const existingMedia = await payload.find({ collection: 'media', limit: 1 })
    if (existingMedia.docs.length > 0) {
      mediaId = existingMedia.docs[0].id
    } else {
      payload.logger.info('— Fetching dummy media image for demo seed...')
      const dummyBuffer = await fetchFileByURL('https://dummyimage.com/600x400/000/fff.jpg')
      const createdMedia = await payload.create({
        collection: 'media',
        data: { alt: 'Demo Placeholder' },
        file: dummyBuffer,
      })
      mediaId = createdMedia.id
    }
  } catch (e) {
    payload.logger.error(`Error ensuring media doc: ${e}`)
  }

  if (!mediaId) {
    payload.logger.error('Failed to obtain a valid mediaId. Retailer and Delivery Partner creation require media.')
    return
  }

  // Helper to create a fresh user for each retailer/partner/customer to prevent unique user ID conflicts
  const createFreshUser = async (name: string, role: string) => {
    const ts = Date.now() + Math.floor(Math.random() * 100000)
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${ts}@demo.com`
    const mobileNumber = `+9198${Math.floor(100000000 + Math.random() * 899999999)}`
    return await payload.create({
      collection: 'users',
      data: {
        name,
        email,
        password: 'password123',
        roles: [role as any],
        mobileNumber,
        mobileVerified: true,
      },
    })
  }

  // 3. Create Fresh Users
  const [c1, c2, c3, c4, c5, c6] = await Promise.all([
    createFreshUser('Rahul Sharma', 'customer'),
    createFreshUser('Priya Patel', 'customer'),
    createFreshUser('Amit Verma', 'customer'),
    createFreshUser('Ananya Singh', 'customer'),
    createFreshUser('Rohan Kapoor', 'customer'),
    createFreshUser('Sneha Reddy', 'customer'),
  ])

  const [rUser1, rUser2, rUser3, rUser4, rUser5] = await Promise.all([
    createFreshUser('Rajesh Kumar Owner', 'retailer'),
    createFreshUser('Suresh Mehta Owner', 'retailer'),
    createFreshUser('Vikram Shah Owner', 'retailer'),
    createFreshUser('Meena Joshi Owner', 'retailer'),
    createFreshUser('Karan Malhotra Owner', 'retailer'),
  ])

  const [pUser1, pUser2, pUser3, pUser4, pUser5, pUser6] = await Promise.all([
    createFreshUser('Ramesh Delivery', 'customer'),
    createFreshUser('Sunil Delivery', 'customer'),
    createFreshUser('Vikas Delivery', 'customer'),
    createFreshUser('Deepak Delivery', 'customer'),
    createFreshUser('Sanjay Delivery', 'customer'),
    createFreshUser('Arun Delivery', 'customer'),
  ])

  const randNum = () => Math.floor(10000000 + Math.random() * 89999999)

  // 4. Create Retailers (3 Approved, 2 Pending)
  const retailersToCreate = [
    {
      shopName: 'TechWorld Electronics',
      ownerName: 'Rajesh Kumar',
      mobileNumber: `+91982${randNum()}`,
      emailId: 'techworld@example.com',
      gstNumber: '27AAAAA0000A1Z5',
      approvalStatus: 'approved',
      user: rUser1.id,
      shopAddress: { street: '102 MG Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
      businessHours: { startTime: '09:00 AM', endTime: '09:00 PM', openEveryday: true },
      images: [mediaId],
    },
    {
      shopName: 'Digital Express Retail',
      ownerName: 'Suresh Mehta',
      mobileNumber: `+91983${randNum()}`,
      emailId: 'digitalexpress@example.com',
      gstNumber: '27BBBBB1111B1Z2',
      approvalStatus: 'approved',
      user: rUser2.id,
      shopAddress: { street: '45 Connaught Place', city: 'New Delhi', state: 'Delhi', zipCode: '110001' },
      businessHours: { startTime: '10:00 AM', endTime: '08:00 PM', openEveryday: false, weekOff: ['Sunday'] },
      images: [mediaId],
    },
    {
      shopName: 'Zini Mart Superstore',
      ownerName: 'Vikram Shah',
      mobileNumber: `+91984${randNum()}`,
      emailId: 'zinimart@example.com',
      gstNumber: '27VVVVV4444V1Z8',
      approvalStatus: 'approved',
      user: rUser3.id,
      shopAddress: { street: '88 MG Road', city: 'Pune', state: 'Maharashtra', zipCode: '411001' },
      businessHours: { startTime: '08:00 AM', endTime: '10:00 PM', openEveryday: true },
      images: [mediaId],
    },
    {
      shopName: 'Glow & Gadgets Hub',
      ownerName: 'Meena Joshi',
      mobileNumber: `+91985${randNum()}`,
      emailId: 'glowgadgets@example.com',
      gstNumber: '27CCCCC2222C1Z9',
      approvalStatus: 'pending',
      user: rUser4.id,
      shopAddress: { street: '12 Commercial Street', city: 'Bengaluru', state: 'Karnataka', zipCode: '560001' },
      businessHours: { startTime: '10:00 AM', endTime: '09:00 PM', openEveryday: true },
      images: [mediaId],
    },
    {
      shopName: 'Apex HyperMarket',
      ownerName: 'Karan Malhotra',
      mobileNumber: `+91986${randNum()}`,
      emailId: 'apexhyper@example.com',
      gstNumber: '27KKKKK5555K1Z3',
      approvalStatus: 'pending',
      user: rUser5.id,
      shopAddress: { street: '7 Sector 18', city: 'Noida', state: 'Uttar Pradesh', zipCode: '201301' },
      businessHours: { startTime: '09:00 AM', endTime: '09:30 PM', openEveryday: true },
      images: [mediaId],
    },
  ]

  const retailerDocs: any[] = []
  for (const r of retailersToCreate) {
    try {
      const created = await payload.create({ collection: 'retailers', data: r as any })
      retailerDocs.push(created)
    } catch (e: any) {
      payload.logger.error(`Error creating retailer ${r.shopName}: ${e?.message || e}`)
    }
  }

  // 5. Create Delivery Partners (3 Approved, 2 Pending, 1 Suspended)
  const partnersToCreate = [
    {
      fullName: 'Ramesh Pawar',
      mobileNumber: `+91987${randNum()}`,
      email: 'ramesh.delivery@example.com',
      gender: 'male',
      dob: '1995-04-12',
      drivingLicenseNumber: 'MH0120180012345',
      drivingLicense: mediaId,
      pancardNumber: 'ABCDE1234F',
      pancardImage: mediaId,
      vehicleBrand: 'Honda Activa 6G',
      vehicleRegistrationNumber: 'MH01AB1234',
      vehicleType: 'scooter',
      selfieImage: mediaId,
      approvalStatus: 'approved',
      onlineStatus: true,
      user: pUser1.id,
    },
    {
      fullName: 'Sunil Yadav',
      mobileNumber: `+91988${randNum()}`,
      email: 'sunil.delivery@example.com',
      gender: 'male',
      dob: '1993-08-22',
      drivingLicenseNumber: 'DL0420190054321',
      drivingLicense: mediaId,
      pancardNumber: 'FGHIJ5678K',
      pancardImage: mediaId,
      vehicleBrand: 'Hero Splendor Plus',
      vehicleRegistrationNumber: 'DL04CD5678',
      vehicleType: 'bike',
      selfieImage: mediaId,
      approvalStatus: 'approved',
      onlineStatus: true,
      user: pUser2.id,
    },
    {
      fullName: 'Vikas Sharma',
      mobileNumber: `+91989${randNum()}`,
      email: 'vikas.delivery@example.com',
      gender: 'male',
      dob: '1996-11-05',
      drivingLicenseNumber: 'KA0220200087654',
      drivingLicense: mediaId,
      pancardNumber: 'VIKAS7890X',
      pancardImage: mediaId,
      vehicleBrand: 'Hero Cycle 21 Speed',
      vehicleRegistrationNumber: 'N/A',
      vehicleType: 'bicycle',
      selfieImage: mediaId,
      approvalStatus: 'approved',
      onlineStatus: false,
      user: pUser3.id,
    },
    {
      fullName: 'Deepak Verma',
      mobileNumber: `+91990${randNum()}`,
      email: 'deepak.delivery@example.com',
      gender: 'male',
      dob: '1998-01-15',
      drivingLicenseNumber: 'KA0320210098765',
      drivingLicense: mediaId,
      pancardNumber: 'LMNOP9012Q',
      pancardImage: mediaId,
      vehicleBrand: 'Maruti Suzuki Alto',
      vehicleRegistrationNumber: 'KA03EF9012',
      vehicleType: 'car',
      selfieImage: mediaId,
      approvalStatus: 'pending',
      onlineStatus: false,
      user: pUser4.id,
    },
    {
      fullName: 'Sanjay Gupta',
      mobileNumber: `+91991${randNum()}`,
      email: 'sanjay.delivery@example.com',
      gender: 'male',
      dob: '1997-06-30',
      drivingLicenseNumber: 'UP1620220033445',
      drivingLicense: mediaId,
      pancardNumber: 'SANJAY123Y',
      pancardImage: mediaId,
      vehicleBrand: 'TVS Jupiter 125',
      vehicleRegistrationNumber: 'UP16GH3344',
      vehicleType: 'scooter',
      selfieImage: mediaId,
      approvalStatus: 'pending',
      onlineStatus: false,
      user: pUser5.id,
    },
    {
      fullName: 'Arun Nair',
      mobileNumber: `+91992${randNum()}`,
      email: 'arun.delivery@example.com',
      gender: 'male',
      dob: '1994-03-18',
      drivingLicenseNumber: 'KL0120170066778',
      drivingLicense: mediaId,
      pancardNumber: 'ARUNN9988Z',
      pancardImage: mediaId,
      vehicleBrand: 'Bajaj Pulsar 150',
      vehicleRegistrationNumber: 'KL01JK6677',
      vehicleType: 'bike',
      selfieImage: mediaId,
      approvalStatus: 'suspended',
      onlineStatus: false,
      user: pUser6.id,
    },
  ]

  const partnerDocs: any[] = []
  for (const p of partnersToCreate) {
    try {
      const created = await payload.create({ collection: 'delivery-partners', data: p as any })
      partnerDocs.push(created)
    } catch (e: any) {
      payload.logger.error(`Error creating delivery partner ${p.fullName}: ${e?.message || e}`)
    }
  }

  // 6. Update All Existing Products with Inventory & Prices
  const allProductsResult = await payload.find({ collection: 'products', limit: 50 })
  for (const prod of allProductsResult.docs) {
    try {
      await payload.update({
        collection: 'products',
        id: prod.id,
        data: {
          inventory: 500,
          priceInINR: prod.priceInINR || 14999,
          discountedPrice: prod.discountedPrice || 12999,
          retailer: retailerDocs[0]?.id || prod.retailer,
        } as any,
      })
    } catch (e: any) {
      // Ignore individual update errors
    }
  }

  // 7. ONLY fetch products that have inventory > 0 for creating orders
  const inStockProductsResult = await payload.find({
    collection: 'products',
    where: {
      inventory: { greater_than: 0 },
    },
    limit: 50,
  })

  const products = inStockProductsResult.docs

  if (products.length === 0 || retailerDocs.length === 0) {
    payload.logger.warn('Skipping orders seed: in-stock products or retailers not available yet.')
    return
  }

  // 8. Create Diverse Orders with item prices and explicit total/subtotal/amount
  const ordersToCreate = [
    {
      customer: c1.id,
      retailer: retailerDocs[0]?.id,
      deliveryPartner: partnerDocs[0]?.id,
      status: ORDER_STATUS.DELIVERED,
      subtotal: 134900,
      total: 134900,
      amount: 134900,
      currency: 'INR',
      pickupOTP: '4821',
      deliveryOTP: '9153',
      deliveryPartnerAcceptance: 'accepted',
      codCollectionRecord: partnerDocs[0]?.id ? { status: 'collected', paymentType: 'cash', collectedBy: partnerDocs[0].id } : undefined,
      items: [{ product: products[0]?.id, quantity: 1, price: 134900 }],
      paymentMethod: 'stripe',
      paymentStatus: 'succeeded',
    },
    {
      customer: c2.id,
      retailer: retailerDocs[1]?.id,
      deliveryPartner: partnerDocs[1]?.id,
      status: ORDER_STATUS.OUT_FOR_DELIVERY,
      subtotal: 29990,
      total: 29990,
      amount: 29990,
      currency: 'INR',
      pickupOTP: '3104',
      deliveryOTP: '7429',
      deliveryPartnerAcceptance: 'accepted',
      items: [{ product: products[1]?.id || products[0]?.id, quantity: 1, price: 29990 }],
      paymentMethod: 'razorpay',
      paymentStatus: 'succeeded',
    },
    {
      customer: c3.id,
      retailer: retailerDocs[2]?.id || retailerDocs[0]?.id,
      deliveryPartner: partnerDocs[0]?.id,
      status: ORDER_STATUS.PICKED_UP,
      subtotal: 14999,
      total: 14999,
      amount: 14999,
      currency: 'INR',
      pickupOTP: '5512',
      deliveryOTP: '6821',
      deliveryPartnerAcceptance: 'accepted',
      codCollectionRecord: partnerDocs[0]?.id ? { status: 'collected', paymentType: 'qr', collectedBy: partnerDocs[0].id } : undefined,
      items: [{ product: products[2]?.id || products[0]?.id, quantity: 1, price: 14999 }],
      paymentMethod: 'cod',
      paymentStatus: 'succeeded',
    },
    {
      customer: c4.id,
      retailer: retailerDocs[0]?.id,
      status: ORDER_STATUS.READY_FOR_PICKUP,
      subtotal: 64999,
      total: 64999,
      amount: 64999,
      currency: 'INR',
      deliveryPartnerAcceptance: 'pending',
      items: [{ product: products[3]?.id || products[0]?.id, quantity: 1, price: 64999 }],
      paymentMethod: 'stripe',
      paymentStatus: 'succeeded',
    },
    {
      customer: c5.id,
      retailer: retailerDocs[1]?.id,
      status: ORDER_STATUS.PACKED,
      subtotal: 129999,
      total: 129999,
      amount: 129999,
      currency: 'INR',
      deliveryPartnerAcceptance: 'pending',
      items: [{ product: products[0]?.id, quantity: 1, price: 129999 }],
      paymentMethod: 'cod',
      paymentStatus: 'pending',
    },
    {
      customer: c6.id,
      retailer: retailerDocs[2]?.id || retailerDocs[0]?.id,
      status: ORDER_STATUS.PREPARING,
      subtotal: 8499,
      total: 8499,
      amount: 8499,
      currency: 'INR',
      deliveryPartnerAcceptance: 'pending',
      items: [{ product: products[1]?.id || products[0]?.id, quantity: 1, price: 8499 }],
      paymentMethod: 'razorpay',
      paymentStatus: 'succeeded',
    },
    {
      customer: c1.id,
      retailer: retailerDocs[0]?.id,
      status: ORDER_STATUS.PLACED,
      subtotal: 49990,
      total: 49990,
      amount: 49990,
      currency: 'INR',
      items: [{ product: products[2]?.id || products[0]?.id, quantity: 1, price: 49990 }],
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
    },
    {
      customer: c2.id,
      retailer: retailerDocs[1]?.id,
      status: ORDER_STATUS.CANCELLED,
      subtotal: 19990,
      total: 19990,
      amount: 19990,
      currency: 'INR',
      cancellationDetails: { cancelledAt: new Date().toISOString(), cancellationReason: 'Customer requested cancellation before dispatch' },
      items: [{ product: products[3]?.id || products[0]?.id, quantity: 1, price: 19990 }],
      paymentMethod: 'razorpay',
      paymentStatus: 'failed',
    },
  ]

  for (const o of ordersToCreate) {
    if (!o.customer || !o.retailer || !o.items[0]?.product) continue
    try {
      const createdOrder = await payload.create({ collection: 'orders', data: o as any })

      // Create transaction for order
      await payload.create({
        collection: 'transactions',
        data: {
          order: createdOrder.id,
          amount: o.total,
          currency: 'INR',
          status: o.paymentStatus || 'succeeded',
          paymentMethod: o.paymentMethod || 'stripe',
        } as any,
      })

      // Add Product Ratings for completed orders
      if (products[0]?.id && (o.status === ORDER_STATUS.DELIVERED || o.status === ORDER_STATUS.OUT_FOR_DELIVERY)) {
        await payload.create({
          collection: 'ratings',
          data: {
            rating: o.status === ORDER_STATUS.DELIVERED ? 5 : 4,
            reviewText: o.status === ORDER_STATUS.DELIVERED ? 'Super fast delivery and 100% original product! Highly recommended.' : 'On-time delivery, excellent service.',
            product: products[0].id,
            retailer: o.retailer,
            customer: o.customer,
          } as any,
        }).catch(() => {})
      }
    } catch (e: any) {
      payload.logger.error(`Error creating demo order: ${e?.message || e}`)
    }
  }

  payload.logger.info('Comprehensive demo data seeded successfully for all collections with amounts and inventory filter!')
}
