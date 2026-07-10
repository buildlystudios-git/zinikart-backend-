import { TaskHandler } from 'payload'
import { ORDER_STATUS, ACTIVE_DELIVERY_STATUSES, DELIVERY_ACCEPTANCE } from '@/constants/orderStatuses'
import { RIDER_OFFER_TIMEOUT_MS } from '@/constants/env'

export const assignDeliveryPartnerTask: TaskHandler<'assignDeliveryPartner'> = async ({ req, input }) => {
  const { orderId } = input
  const payload = req.payload
  
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1, // need retailer to get location
      req,
    })

    if (!order || order.status !== ORDER_STATUS.ORDER_RECEIVED || order.deliveryPartner) {
      return { output: { success: false, reason: 'Order already assigned or invalid status' } }
    }

    // A real implementation would calculate proximity using geo-coordinates.
    // For now, we simulate finding an active, approved, non-busy rider.
    const activeOrders = await payload.find({
      collection: 'orders',
      where: {
        status: { in: ACTIVE_DELIVERY_STATUSES },
        deliveryPartnerAcceptance: { equals: DELIVERY_ACCEPTANCE.ACCEPTED },
        deliveryPartner: { exists: true }
      },
      depth: 0,
      req,
    })
    
    const busyRiderIds = activeOrders.docs.map(o => 
      typeof o.deliveryPartner === 'object' && o.deliveryPartner ? o.deliveryPartner.id : o.deliveryPartner
    ).filter(Boolean)

    const rejectedIds = (order.rejectedDeliveryPartners || []).map((rp: any) => 
      typeof rp === 'object' ? rp.id : rp
    )
    
    const excludedIds = [...busyRiderIds, ...rejectedIds]

    // Calculate stale threshold (e.g., 15 minutes ago)
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // Find candidate
    const candidates = await payload.find({
      collection: 'delivery-partners',
      where: {
        approvalStatus: { equals: 'approved' },
        onlineStatus: { equals: true },
        lastLocationUpdatedAt: { greater_than: staleThreshold },
        ...(excludedIds.length > 0 && { id: { not_in: excludedIds } })
      },
      limit: 1,
      req,
    })

    if (candidates.docs.length === 0) {
      // Mark unassignable
      await payload.update({
        collection: 'orders',
        id: orderId,
        data: { deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.UNASSIGNABLE },
        req,
      })
      return { output: { success: false, reason: 'No available riders' } }
    }

    const candidate = candidates.docs[0]
    const expiry = new Date(Date.now() + RIDER_OFFER_TIMEOUT_MS)

    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        currentOfferedPartner: candidate.id,
        offerExpiresAt: expiry.toISOString(),
        deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.PENDING,
      },
      req,
    })

    // Queue timeout check
    await payload.jobs.queue({
      task: 'checkOfferTimeout',
      input: { orderId, candidateId: candidate.id },
      waitUntil: expiry,
    })

    return { output: { success: true, candidateId: candidate.id } }
  } catch (error: any) {
    payload.logger.error(`Error assigning delivery partner for order ${orderId}: ${error.message}`)
    throw error
  }
}
