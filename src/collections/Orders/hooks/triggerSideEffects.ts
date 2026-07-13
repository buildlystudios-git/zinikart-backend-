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
  const customerId = typeof doc.customer === 'object' ? doc.customer.id : doc.customer

  const getRetailerUserId = async (retailerId: string) => {
    const retailer = await payload.findByID({ collection: 'retailers', id: retailerId, depth: 0 })
    return typeof retailer.user === 'object' ? retailer.user.id : retailer.user
  }
  
  const getDpUserId = async (dpId: string) => {
    const dp = await payload.findByID({ collection: 'delivery-partners', id: dpId, depth: 0 })
    return typeof dp.user === 'object' ? dp.user.id : dp.user
  }

  // Queue retailer timeout when order is placed
  if (operation === 'create' && doc.status === ORDER_STATUS.PLACED) {
    try {
      await payload.jobs.queue({
        task: 'retailerActionTimeout',
        input: { orderId: doc.id },
        waitUntil: new Date(Date.now() + RETAILER_ACTION_TIMEOUT_MS),
      })

      // Push to customer
      await payload.jobs.queue({
        workflow: 'dispatchPushNotification',
        input: { recipientUserId: customerId, templateKey: 'ORDER_PLACED', templateData: { orderId: doc.id } }
      })

      // Push to retailer
      const retailerId = typeof doc.retailer === 'object' ? doc.retailer.id : doc.retailer
      const retailerUserId = await getRetailerUserId(retailerId)
      if (retailerUserId) {
        const timeoutMinutes = String(Math.floor(RETAILER_ACTION_TIMEOUT_MS / 60000))
        await payload.jobs.queue({
          workflow: 'dispatchPushNotification',
          input: { recipientUserId: retailerUserId, templateKey: 'RETAILER_NEW_ORDER', templateData: { orderId: doc.id, amount: (((doc as any).total || (doc as any).subtotal || 0) / 100).toFixed(2), timeoutMinutes } }
        })
      }

    } catch (err: any) {
      payload.logger.error(`Error queueing retailer action timeout or pushes: ${err.message}`)
    }
  }

  // Trigger Delivery Partner Assignment Strategy & Push to Customer
  if (doc.status === ORDER_STATUS.ORDER_RECEIVED && previousDoc?.status !== ORDER_STATUS.ORDER_RECEIVED) {
    try {
      await getAssignmentStrategy().assign(doc.id, payload)
      
      await payload.jobs.queue({
        workflow: 'dispatchPushNotification',
        input: { recipientUserId: customerId, templateKey: 'ORDER_RECEIVED', templateData: { orderId: doc.id } }
      })
    } catch (err: any) {
      payload.logger.error(`Error triggering delivery assignment strategy or pushes: ${err.message}`)
    }
  }

  // Out for delivery pushes
  if (doc.status === ORDER_STATUS.OUT_FOR_DELIVERY && previousDoc?.status !== ORDER_STATUS.OUT_FOR_DELIVERY) {
    try {
      await payload.jobs.queue({
        workflow: 'dispatchPushNotification',
        input: { recipientUserId: customerId, templateKey: 'ORDER_OUT_FOR_DELIVERY', templateData: { orderId: doc.id } }
      })

      if (doc.paymentMethod === 'cod' && doc.deliveryPartner) {
        const dpId = typeof doc.deliveryPartner === 'object' ? doc.deliveryPartner.id : doc.deliveryPartner
        const dpUserId = await getDpUserId(dpId)
        if (dpUserId) {
          await payload.jobs.queue({
            workflow: 'dispatchPushNotification',
            input: { recipientUserId: dpUserId, templateKey: 'COD_COLLECTION_REMINDER', templateData: { orderId: doc.id } }
          })
        }
      }
    } catch (err: any) {
      payload.logger.error(`Error queueing out for delivery pushes: ${err.message}`)
    }
  }

  // Delivered pushes
  if (doc.status === ORDER_STATUS.DELIVERED && previousDoc?.status !== ORDER_STATUS.DELIVERED) {
    try {
      await payload.jobs.queue({
        workflow: 'dispatchPushNotification',
        input: { recipientUserId: customerId, templateKey: 'ORDER_DELIVERED', templateData: { orderId: doc.id } }
      })
    } catch (err: any) {
      payload.logger.error(`Error queueing delivered pushes: ${err.message}`)
    }
  }

  // Handle Cancelled (Razorpay Refund + Pushes)
  if (doc.status === ORDER_STATUS.CANCELLED && previousDoc?.status !== ORDER_STATUS.CANCELLED) {
    try {
      // Reason-aware cancellation copy for customer
      let templateKey = 'ORDER_CANCELLED_ADMIN'
      const lastHistory = doc.statusHistory && doc.statusHistory.length > 0 ? doc.statusHistory[doc.statusHistory.length - 1] : null
      const changeSource = lastHistory?.changeSource || 'admin'
      
      if (changeSource === 'system') {
        templateKey = 'ORDER_CANCELLED_TIMEOUT'
      } else if (changeSource === 'retailer') {
        templateKey = 'ORDER_CANCELLED_REJECTED'
      }

      await payload.jobs.queue({
        workflow: 'dispatchPushNotification',
        input: { recipientUserId: customerId, templateKey, templateData: { orderId: doc.id } }
      })

      // If mid-flight cancel to DP
      if (doc.deliveryPartner) {
        const pickedUp = (doc.statusHistory || []).some((h: any) => h.status === ORDER_STATUS.PICKED_UP)
        if (pickedUp) {
          const dpId = typeof doc.deliveryPartner === 'object' ? doc.deliveryPartner.id : doc.deliveryPartner
          const dpUserId = await getDpUserId(dpId)
          if (dpUserId) {
            await payload.jobs.queue({
              workflow: 'dispatchPushNotification',
              input: { recipientUserId: dpUserId, templateKey: 'DELIVERY_CANCELLED_MIDWAY', templateData: { orderId: doc.id } }
            })
          }
        }
      }

      // Razorpay refund — only fetch transactions for this specific order
      const orderTxIds = ((doc as any).transactions || []).map((t: any) => typeof t === 'object' ? t.id : t)

      if (orderTxIds.length > 0) {
        const transactions = await payload.find({
          collection: 'transactions',
          where: {
            and: [
              { id: { in: orderTxIds } },
              { paymentMethod: { equals: 'razorpay' } },
              { status: { equals: 'succeeded' } },
            ],
          },
          overrideAccess: true,
        })

        for (const tx of transactions.docs) {
          await payload.jobs.queue({
            task: 'processRazorpayRefund',
            input: { transactionId: tx.id },
          })
          payload.logger.info(`Queued refund for transaction ${tx.id} on cancelled order ${doc.id}`)
        }
      }
    } catch (err: any) {
      payload.logger.error(`Error handling cancelled side effects: ${err.message}`)
    }
  }
  return doc
}
