import type { TaskHandler } from 'payload'

export const checkOfferTimeoutTask: TaskHandler<any> = async ({ req, input }) => {
  const { orderId, candidateId } = input as { orderId: string, candidateId: string }
  const payload = req.payload
  
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      req,
    })

    if (!order) return { output: { success: false, reason: 'Order not found' } }

    const currentPartnerId = typeof order.currentOfferedPartner === 'object' && order.currentOfferedPartner ? order.currentOfferedPartner.id : order.currentOfferedPartner

    if (
      order.deliveryPartnerAcceptance === 'pending' &&
      currentPartnerId === candidateId &&
      order.offerExpiresAt &&
      new Date(order.offerExpiresAt).getTime() <= Date.now()
    ) {
      const rejectedList = (order.rejectedDeliveryPartners || []).map((rp: any) => 
        typeof rp === 'object' ? rp.id : rp
      )
      
      await payload.update({
        collection: 'orders',
        id: orderId,
        data: {
          deliveryPartnerAcceptance: 'rejected',
          rejectedDeliveryPartners: [...rejectedList, candidateId],
          currentOfferedPartner: null,
        },
        req,
      })

      await payload.jobs.queue({
        task: 'assignDeliveryPartner',
        input: { orderId },
      })
      
      return { output: { success: true, action: 'rejected_and_requeued' } }
    }
    
    return { output: { success: true, action: 'no_op' } }
  } catch (error) {
    payload.logger.error(`Error checking offer timeout for order ${orderId}: ${error}`)
    throw error
  }
}
