import { TaskHandler } from 'payload'
import { ORDER_STATUS, CHANGE_SOURCE } from '@/constants/orderStatuses'

export const retailerActionTimeoutTask: TaskHandler<'retailerActionTimeout'> = async ({
  input,
  req,
}) => {
  const { orderId } = input
  const payload = req.payload

  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
    })

    if (order.status === ORDER_STATUS.PLACED) {
      await payload.update({
        collection: 'orders',
        id: orderId,
        data: {
          status: ORDER_STATUS.ORDER_RECEIVED,
        },
        context: {
          changeSource: CHANGE_SOURCE.SYSTEM,
        },
        req,
      })
      payload.logger.info(`Order ${orderId} automatically accepted due to retailer timeout.`)
      return { output: { success: true, action: 'auto_accepted' } }
    }
    return { output: { success: true, action: 'ignored', reason: 'Order already processed' } }
  } catch (error: any) {
    payload.logger.error(`Error in retailerActionTimeout for order ${orderId}: ${error.message}`)
    throw error
  }
}
