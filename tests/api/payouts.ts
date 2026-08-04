import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'
import { processPayoutsTask } from '../../src/jobs/processPayouts'

export async function runPayoutTests(
  report: ReportManager,
  payload: Payload,
  adminToken: string,
  retailerToken: string
) {
  report.setSuite('Payouts Module')
  console.log('\nRunning Payouts Module tests...')

  // 1. Get retailer user info
  const retailerMeRes = await apiRequest('/api/users/me', 'GET', null, retailerToken)
  const retailerUserId = retailerMeRes.body?.user?.id

  // Get retailer profile
  const profileRes = await apiRequest('/api/retailers/me', 'GET', null, retailerToken)
  const retailerProfileId = profileRes.body?.retailer?.id

  if (!retailerUserId || !retailerProfileId) {
    report.assert('Payouts setup failed: missing retailer user or profile', false, 'Best Case')
    return
  }

  // 2. Set platform settings globally via Payload API
  await payload.updateGlobal({
    slug: 'platform-settings',
    data: {
      platformFeePercentage: 5,
      deliveryFee: 50,
      payoutDelayDays: 1, // 1 day
    } as any,
    overrideAccess: true,
  })

  // 3. Create dummy order
  const mockOrder = await payload.create({
    collection: 'orders',
    data: {
      customer: retailerUserId, // Doesn't matter
      retailer: retailerProfileId,
      orderNumber: `TEST-ORD-PAYOUT-${Date.now()}`,
      status: 'delivered',
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      totalAmount: 1000,
      items: [],
      deliveryAddress: { street: '123', city: 'test', state: 'test', zipCode: '111111' },
      deliveryFee: 50,
    } as any,
    overrideAccess: true,
  })

  // 4. Create dummy payout ledger entry representing matured order
  const ledger = await payload.create({
    collection: 'payout-ledger',
    data: {
      order: mockOrder.id,
      recipient: retailerUserId,
      recipientType: 'retailer',
      retailerProfile: retailerProfileId,
      grossAmount: 1000,
      platformFeePercent: 5,
      platformFeeAmount: 50,
      netAmount: 950,
      status: 'pending',
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      eligibleAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    overrideAccess: true,
  })

  // 5. Test Retailer fetching ledger
  const ledgerRes = await apiRequest('/api/mobile/payouts/my-ledger', 'GET', null, retailerToken)
  report.assert(
    'Retailer can fetch their payout ledger',
    ledgerRes.status === 200 && ledgerRes.body?.data?.docs?.some((d: any) => d.id === ledger.id),
    'Best Case',
    `Expected status 200 and ledger presence, got ${ledgerRes.status}`
  )

  // 6. Test Security: unauthenticated access fails
  const unauthRes = await apiRequest('/api/mobile/payouts/my-ledger', 'GET', null)
  report.assert(
    'Unauthenticated user cannot fetch ledger',
    unauthRes.status === 401 || unauthRes.status === 403 || unauthRes.status === 404, // Unauthenticated user might be caught by checkUser
    'Possible Scenario',
    `Expected auth denial, got ${unauthRes.status}`
  )

  // 7. Create a dummy payout invoice 
  const invoice = await payload.create({
    collection: 'payout-invoices',
    data: {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      invoiceType: 'retailer',
      recipient: retailerUserId,
      retailerProfile: retailerProfileId,
      period: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      lineItems: [
        {
          orderRef: mockOrder.id,
          orderNumber: (mockOrder as any).orderNumber,
          grossAmount: 1000,
          platformFeePercent: 5,
          platformFeeAmount: 50,
          netAmount: 950,
          deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
      totalGross: 1000,
      totalFees: 50,
      totalNet: 950,
      payoutDestination: {
        methodType: 'bank_account',
        accountHolderName: 'Tester',
        accountNumber: '1234567890',
        ifscCode: 'IFSC000123'
      },
    } as any,
    overrideAccess: true,
  })

  // Link ledger to invoice
  await payload.update({
    collection: 'payout-ledger',
    id: ledger.id,
    data: { payoutInvoice: invoice.id },
    overrideAccess: true,
  })

  // 8. Test Retailer fetching invoices
  const invoicesRes = await apiRequest('/api/mobile/payouts/my-invoices', 'GET', null, retailerToken)
  report.assert(
    'Retailer can fetch their invoices',
    invoicesRes.status === 200 && invoicesRes.body?.data?.docs?.some((d: any) => d.id === invoice.id),
    'Best Case'
  )

  // 9. Test Security: Retailer trying to mark disbursed fails
  const retailerDisburseRes = await apiRequest(`/api/payout-invoices/${invoice.id}/mark-disbursed`, 'POST', { payoutRef: 'TEST-REF' }, retailerToken)
  report.assert(
    'Retailer cannot mark invoice as disbursed',
    retailerDisburseRes.status === 403 || retailerDisburseRes.status === 401,
    'Possible Scenario',
    `Expected 403, got ${retailerDisburseRes.status}`
  )

  // 10. Test Best Case: Admin marks as disbursed
  const adminDisburseRes = await apiRequest(`/api/payout-invoices/${invoice.id}/mark-disbursed`, 'POST', { payoutRef: 'TEST-REF' }, adminToken)
  report.assert(
    'Admin can mark invoice as disbursed',
    adminDisburseRes.status === 200 && adminDisburseRes.body?.success === true,
    'Best Case',
    `Expected 200 and success: true, got ${adminDisburseRes.status} - ${JSON.stringify(adminDisburseRes.body)}`
  )

  // 11. Test that related ledger entries are marked as paid
  const updatedLedger = await payload.findByID({
    collection: 'payout-ledger',
    id: ledger.id,
    overrideAccess: true,
  })
  report.assert(
    'Related ledgers are marked as paid upon invoice disbursal',
    updatedLedger.status === 'paid',
    'Best Case',
    `Expected ledger status 'paid', got ${updatedLedger.status}`
  )

  // ==========================================
  // 12. Test processPayouts Job
  // ==========================================
  console.log('Running processPayouts integration tests...')

  // Set platform settings for Auto mode
  await payload.updateGlobal({
    slug: 'platform-settings',
    data: {
      minPayoutAmountINR: 100,
      payoutMode: 'auto',
      razorpayXGroup: {
        razorpayXAccountNumber: 'dummy_acc',
        razorpayXKeyId: 'dummy_key',
        razorpayXKeySecret: 'dummy_secret'
      }
    } as any,
    overrideAccess: true,
  })

  // Create mock order 2 (delivered)
  const mockOrder2 = await payload.create({
    collection: 'orders',
    data: {
      customer: retailerUserId,
      retailer: retailerProfileId,
      orderNumber: `TEST-ORD-PAYOUT-2-${Date.now()}`,
      status: 'delivered',
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      totalAmount: 1000,
      items: [],
      deliveryAddress: { street: '123', city: 'test', state: 'test', zipCode: '111111' },
      deliveryFee: 50,
    } as any,
    overrideAccess: true,
  })

  // Create mock order 3 (cancelled)
  const mockOrderCancelled = await payload.create({
    collection: 'orders',
    data: {
      customer: retailerUserId,
      retailer: retailerProfileId,
      orderNumber: `TEST-ORD-PAYOUT-3-${Date.now()}`,
      status: 'cancelled',
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      totalAmount: 1000,
      items: [],
      deliveryAddress: { street: '123', city: 'test', state: 'test', zipCode: '111111' },
      deliveryFee: 50,
    } as any,
    overrideAccess: true,
  })

  // Ledger 1: Eligible
  const ledgerEligible = await payload.create({
    collection: 'payout-ledger',
    data: {
      order: mockOrder2.id,
      recipient: retailerUserId,
      recipientType: 'retailer',
      retailerProfile: retailerProfileId,
      grossAmount: 1000,
      platformFeePercent: 5,
      platformFeeAmount: 50,
      netAmount: 950,
      status: 'pending',
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      eligibleAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    overrideAccess: true,
  })

  // Ledger 2: Future
  const ledgerFuture = await payload.create({
    collection: 'payout-ledger',
    data: {
      order: mockOrder2.id,
      recipient: retailerUserId,
      recipientType: 'retailer',
      retailerProfile: retailerProfileId,
      grossAmount: 1000,
      platformFeePercent: 5,
      platformFeeAmount: 50,
      netAmount: 950,
      status: 'pending',
      deliveredAt: new Date().toISOString(),
      eligibleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    overrideAccess: true,
  })

  // Ledger 3: Cancelled Order
  const ledgerCancelled = await payload.create({
    collection: 'payout-ledger',
    data: {
      order: mockOrderCancelled.id,
      recipient: retailerUserId,
      recipientType: 'retailer',
      retailerProfile: retailerProfileId,
      grossAmount: 1000,
      platformFeePercent: 5,
      platformFeeAmount: 50,
      netAmount: 950,
      status: 'pending',
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      eligibleAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    overrideAccess: true,
  })

  // Run Job
  await processPayoutsTask({ req: { payload } } as any)

  // Verify Results
  const updatedLedgerEligible = await payload.findByID({ collection: 'payout-ledger', id: ledgerEligible.id, overrideAccess: true })
  const updatedLedgerFuture = await payload.findByID({ collection: 'payout-ledger', id: ledgerFuture.id, overrideAccess: true })
  const updatedLedgerCancelled = await payload.findByID({ collection: 'payout-ledger', id: ledgerCancelled.id, overrideAccess: true })

  report.assert(
    'Ledger with past eligibleAt is advanced and processed (Auto Stub)',
    updatedLedgerEligible.status === 'failed' && updatedLedgerEligible.failureReason === 'Razorpay X not implemented',
    'Best Case'
  )

  report.assert(
    'Ledger with future eligibleAt is NOT advanced',
    updatedLedgerFuture.status === 'pending',
    'Possible Scenario'
  )

  report.assert(
    'Ledger linked to cancelled order is put on_hold',
    updatedLedgerCancelled.status === 'on_hold',
    'Possible Scenario'
  )
  
  const createdInvoice = updatedLedgerEligible.payoutInvoice
  
  if (createdInvoice) {
    const invId = typeof createdInvoice === 'object' ? createdInvoice.id : createdInvoice
    const inv = await payload.findByID({ collection: 'payout-invoices', id: invId as string, overrideAccess: true })
    
    report.assert(
      'Invoice is created with correct lineItems and period from/to',
      inv && inv.lineItems?.length === 1 && new Date(inv.period?.from as string).getTime() === new Date(ledgerEligible.eligibleAt as string).getTime(),
      'Best Case'
    )
    
    report.assert(
      'Auto mode stub fails invoice gracefully',
      inv.status === 'issued' && typeof inv.adminNotes === 'string' && inv.adminNotes.includes('Razorpay X not implemented'),
      'Best Case'
    )
  } else {
    report.assert('Invoice is created with correct lineItems and period from/to', false, 'Best Case', 'No invoice linked')
    report.assert('Auto mode stub fails invoice gracefully', false, 'Best Case', 'No invoice linked')
  }
}
