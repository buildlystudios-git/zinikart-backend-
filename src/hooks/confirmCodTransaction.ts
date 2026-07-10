import type { CollectionAfterChangeHook } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'

export const confirmCodTransaction: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const payload = req.payload

  if (operation === 'update' && doc.status === ORDER_STATUS.COD_PAYMENT_RECEIVED && previousDoc?.status !== ORDER_STATUS.COD_PAYMENT_RECEIVED) {
    try {
      // Retrieve the full order with overrideAccess: true to bypass user-level field restrictions
      const fullOrder = await payload.findByID({
        collection: 'orders',
        id: doc.id,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const transactionIds = fullOrder.transactions || []

      for (const txId of transactionIds) {
        const id = typeof txId === 'object' ? txId.id : txId
        const transaction = await payload.findByID({
          collection: 'transactions',
          id,
          depth: 0,
          overrideAccess: true,
          req,
        })

        if (transaction && transaction.paymentMethod === 'cod' && transaction.status === 'pending') {
          await payload.update({
            collection: 'transactions',
            id,
            data: {
              status: 'succeeded',
            },
            overrideAccess: true,
            req,
          })
          payload.logger.info(`COD Transaction ${id} automatically marked as succeeded because Order ${doc.id} status changed to completed.`)
        }
      }
    } catch (err: any) {
      payload.logger.error(`Error automatically confirming COD transaction for Order ${doc.id}: ${err.message}`)
    }
  }
}
