import { CollectionAfterChangeHook } from 'payload'
import { Transaction, Order } from '@/payload-types'

export const transactionsAfterChange: CollectionAfterChangeHook<Transaction> = async ({
  doc,
  previousDoc,
  operation,
  req: { payload, user },
}) => {
  // If transaction is linked to an order, denormalize paymentMethod to the order
  if (doc.order && doc.paymentMethod) {
    const orderId = typeof doc.order === 'object' ? doc.order.id : doc.order
    
    try {
      const order = await payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 0,
      })

      if (order && order.paymentMethod !== doc.paymentMethod) {
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            paymentMethod: doc.paymentMethod,
          },
        })
      }
    } catch (error) {
      payload.logger.error(`Error denormalizing paymentMethod to order ${orderId}: ${error}`)
    }
  }

  // Trigger PAYMENT_CONFIRMED push notification
  if (
    doc.status === 'succeeded' &&
    previousDoc?.status !== 'succeeded' &&
    doc.order &&
    doc.customer
  ) {
    const orderId = typeof doc.order === 'object' ? doc.order.id : doc.order
    const customerId = typeof doc.customer === 'object' ? doc.customer.id : doc.customer

    await payload.jobs.queue({
      workflow: 'dispatchPushNotification',
      input: {
        recipientUserId: customerId,
        templateKey: 'PAYMENT_CONFIRMED',
        templateData: {
          orderId,
          amount: ((doc.amount || 0) / 100).toFixed(2), // assuming amount is in cents/paise
        },
      },
    })
  }

  return doc
}
