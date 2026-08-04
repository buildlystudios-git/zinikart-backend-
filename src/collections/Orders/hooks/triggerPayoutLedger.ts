import type { CollectionAfterChangeHook } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'

export const triggerPayoutLedger: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const payload = req.payload

  // Handle Order Delivered
  if (
    operation === 'update' &&
    doc.status === ORDER_STATUS.DELIVERED &&
    previousDoc?.status !== ORDER_STATUS.DELIVERED
  ) {
    try {
      // 1. Skip if already run (check if ledger exists for this order)
      const existingLedger = await payload.find({
        collection: 'payout-ledger',
        where: { order: { equals: doc.id } },
        depth: 0,
        req,
      })
      if (existingLedger.totalDocs > 0) return doc

      // 2. Fetch PlatformSettings
      const platformSettings = await payload.findGlobal({
        slug: 'platform-settings',
        req,
      })

      // TODO: Handle COD path differences for ledger creation
      // Currently assumes Razorpay pre-paid flow where Platform holds the money.

      const payoutDelayDays = (platformSettings.payoutDelayDays as number) || 0
      const eligibleAt = new Date(Date.now() + payoutDelayDays * 86400000).toISOString()
      const deliveredAt = new Date().toISOString()

      // Calculate Retailer earnings
      const retailerFeePercent = (platformSettings.platformFeeRetailer as number) || 0
      const retailerGross = doc.subtotal || 0
      const retailerPlatformFeeAmount = (retailerGross * retailerFeePercent) / 100
      const retailerNet = retailerGross - retailerPlatformFeeAmount
      
      const retailerId = typeof doc.retailer === 'object' && doc.retailer ? doc.retailer.id : doc.retailer
      const retailers = await payload.find({
        collection: 'retailers',
        where: { id: { equals: retailerId } },
        depth: 0,
        req,
      })
      const retailerUser = retailers.docs[0]?.user

      if (retailerUser) {
        await payload.create({
          collection: 'payout-ledger',
          data: {
            order: doc.id,
            recipient: typeof retailerUser === 'object' ? retailerUser.id : retailerUser,
            recipientType: 'retailer',
            retailerProfile: retailerId,
            grossAmount: retailerGross,
            platformFeePercent: retailerFeePercent,
            platformFeeAmount: retailerPlatformFeeAmount,
            netAmount: retailerNet,
            deliveredAt,
            eligibleAt,
            status: 'pending',
          },
          req,
        })
      }

      // Calculate DP earnings
      const dpFeePercent = (platformSettings.platformFeeDP as number) || 0
      const dpGross = (doc.deliveryFee as number) || (platformSettings.defaultDeliveryFee as number) || 0
      const dpPlatformFeeAmount = (dpGross * dpFeePercent) / 100
      const dpNet = dpGross - dpPlatformFeeAmount

      const dpId = typeof doc.deliveryPartner === 'object' && doc.deliveryPartner ? doc.deliveryPartner.id : doc.deliveryPartner
      
      if (dpId) {
        const dps = await payload.find({
          collection: 'delivery-partners',
          where: { id: { equals: dpId } },
          depth: 0,
          req,
        })
        const dpUser = dps.docs[0]?.user
        
        if (dpUser) {
          await payload.create({
            collection: 'payout-ledger',
            data: {
              order: doc.id,
              recipient: typeof dpUser === 'object' ? dpUser.id : dpUser,
              recipientType: 'delivery_partner',
              deliveryPartnerProfile: dpId,
              grossAmount: dpGross,
              platformFeePercent: dpFeePercent,
              platformFeeAmount: dpPlatformFeeAmount,
              netAmount: dpNet,
              deliveredAt,
              eligibleAt,
              status: 'pending',
            },
            req,
          })
        }
      }
    } catch (err: any) {
      payload.logger.error(`Error creating payout ledger for order ${doc.id}: ${err.message}`)
    }
  }

  // Handle Order Cancellation (Suspend payouts)
  // TODO: When a 'returned' order status is added, handle suspending payouts for returns here as well.
  if (
    operation === 'update' &&
    doc.status === ORDER_STATUS.CANCELLED &&
    previousDoc?.status !== ORDER_STATUS.CANCELLED
  ) {
    try {
      const existingLedgers = await payload.find({
        collection: 'payout-ledger',
        where: {
          and: [
            { order: { equals: doc.id } },
            { status: { in: ['pending', 'eligible', 'processing'] } },
          ],
        },
        depth: 0,
        req,
      })

      for (const ledger of existingLedgers.docs) {
        await payload.update({
          collection: 'payout-ledger',
          id: ledger.id,
          data: {
            status: 'on_hold',
            adminNotes: 'Order cancelled, payout suspended.',
          },
          req,
        })
        payload.logger.warn(`Suspended payout ledger ${ledger.id} for cancelled order ${doc.id}`)
      }
    } catch (err: any) {
      payload.logger.error(`Error suspending payout ledger for order ${doc.id}: ${err.message}`)
    }
  }

  return doc
}
