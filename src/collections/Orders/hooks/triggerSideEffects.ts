import type { CollectionAfterChangeHook } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'
import { RETAILER_ACTION_TIMEOUT_MS } from '@/constants/env'
import { getAssignmentStrategy } from '@/services/delivery-assignment/dispatcher'

export const triggerSideEffects: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const payload = req.payload

  // Queue retailer timeout when order is placed
  if (operation === 'create' && doc.status === ORDER_STATUS.PLACED) {
    try {
      await payload.jobs.queue({
        task: 'retailerActionTimeout',
        input: { orderId: doc.id },
        waitUntil: new Date(Date.now() + RETAILER_ACTION_TIMEOUT_MS),
      })
    } catch (err: any) {
      payload.logger.error(`Error queueing retailer action timeout: ${err.message}`)
    }
  }

  // Trigger Delivery Partner Assignment Strategy
  if (doc.status === ORDER_STATUS.ORDER_RECEIVED && previousDoc?.status !== ORDER_STATUS.ORDER_RECEIVED) {
    try {
      await getAssignmentStrategy().assign(doc.id, payload)
    } catch (err: any) {
      payload.logger.error(`Error triggering delivery assignment strategy: ${err.message}`)
    }
  }

  // Handle Razorpay Refund on Cancelled
  if (doc.status === ORDER_STATUS.CANCELLED && previousDoc?.status !== ORDER_STATUS.CANCELLED) {
    try {
      const transactions = await payload.find({
        collection: 'transactions',
        where: {
          'and': [
            { paymentMethod: { equals: 'razorpay' } },
            { status: { equals: 'succeeded' } },
          ],
        },
        overrideAccess: true,
      })

      for (const tx of transactions.docs) {
        // Find if this transaction is linked to this order
        const fullOrder = await payload.findByID({
          collection: 'orders',
          id: doc.id,
          overrideAccess: true,
          depth: 0,
        })
        const txIds = (fullOrder.transactions || []).map(t => typeof t === 'object' ? t.id : t)
        
        if (txIds.includes(tx.id)) {
          await payload.jobs.queue({
            task: 'processRazorpayRefund',
            input: { transactionId: tx.id },
          })
          payload.logger.info(`Queued refund for transaction ${tx.id} on cancelled order ${doc.id}`)
        }
      }
    } catch (err: any) {
      payload.logger.error(`Error checking transactions for refund: ${err.message}`)
    }
  }
  return doc
}
