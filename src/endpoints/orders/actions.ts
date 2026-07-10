import type { Endpoint } from 'payload'
import { ORDER_STATUS, CHANGE_SOURCE, DELIVERY_ACCEPTANCE } from '@/constants/orderStatuses'
import { getAssignmentStrategy } from '@/services/delivery-assignment/dispatcher'

export const retailerActionEndpoint: Endpoint = {
  path: '/:id/retailer-action',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    
    const { id } = req.routeParams as { id: string }
    const { action, reason } = typeof req.json === 'function' ? await req.json() : req.body
    const payload = req.payload

    const retailers = await payload.find({
      collection: 'retailers',
      where: { user: { equals: req.user.id } },
      depth: 0,
      req,
    })

    if (retailers.docs.length === 0) return Response.json({ success: false, reason: 'Not a retailer' }, { status: 403 })
    const retailerId = retailers.docs[0].id

    const order = await payload.findByID({ collection: 'orders', id, depth: 0, req })
    if (!order) return Response.json({ success: false, reason: 'Not found' }, { status: 404 })

    const orderRetailerId = typeof order.retailer === 'object' && order.retailer ? order.retailer.id : order.retailer
    if (orderRetailerId !== retailerId) {
      return Response.json({ success: false, reason: 'Unauthorized to act on this order' }, { status: 403 })
    }

    if (order.status !== ORDER_STATUS.PLACED) {
      return Response.json({ success: false, reason: 'Order is no longer in placed status' }, { status: 400 })
    }
    
    if (action === 'accept') {
      await payload.update({
        collection: 'orders',
        id,
        data: { status: ORDER_STATUS.ORDER_RECEIVED },
        req,
        context: { changeSource: CHANGE_SOURCE.RETAILER }
      })
      return Response.json({ success: true, status: ORDER_STATUS.ORDER_RECEIVED })
    }
    
    if (action === 'reject') {
      await payload.update({
        collection: 'orders',
        id,
        data: { 
          status: ORDER_STATUS.CANCELLED,
          cancellationDetails: {
            cancelledBy: req.user.id,
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason || 'Rejected by retailer',
          }
        },
        req,
        context: { changeSource: CHANGE_SOURCE.RETAILER }
      })
      return Response.json({ success: true, status: ORDER_STATUS.CANCELLED })
    }

    return Response.json({ success: false, reason: 'Invalid action' }, { status: 400 })
  }
}

export const deliveryActionEndpoint: Endpoint = {
  path: '/:id/delivery-action',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })

    const { id } = req.routeParams as { id: string }
    const { action } = typeof req.json === 'function' ? await req.json() : req.body
    const payload = req.payload

    const partners = await payload.find({
      collection: 'delivery-partners',
      where: { user: { equals: req.user.id } },
      depth: 0,
      req,
    })

    if (partners.docs.length === 0) return Response.json({ success: false, reason: 'Not a delivery partner' }, { status: 403 })
    const partnerId = partners.docs[0].id

    if (action === 'accept') {
      const result = await payload.update({
        collection: 'orders',
        where: {
          id: { equals: id },
          deliveryPartnerAcceptance: { equals: DELIVERY_ACCEPTANCE.PENDING },
          deliveryPartner: { exists: false },
          currentOfferedPartner: { equals: partnerId },
        },
        data: {
          deliveryPartner: partnerId,
          deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.ACCEPTED,
        },
        req,
      })

      if (result.docs.length === 0) {
        return Response.json({ success: false, reason: 'Offer expired or already assigned' }, { status: 409 })
      }
      return Response.json({ success: true, status: 'assigned' })
    }
    
    if (action === 'reject') {
      const order = await payload.findByID({ collection: 'orders', id, depth: 0, req })
      if (!order) return Response.json({ success: false, reason: 'Not found' }, { status: 404 })

      const currentOfferedPartnerId = typeof order.currentOfferedPartner === 'object' && order.currentOfferedPartner ? order.currentOfferedPartner.id : order.currentOfferedPartner
      if (currentOfferedPartnerId !== partnerId) {
        return Response.json({ success: false, reason: 'Unauthorized to reject this offer' }, { status: 403 })
      }

      const rejectedList = (order.rejectedDeliveryPartners || []).map((rp: any) => typeof rp === 'object' ? rp.id : rp)
      await payload.update({
        collection: 'orders',
        id,
        data: {
          deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.REJECTED,
          rejectedDeliveryPartners: [...rejectedList, partnerId],
          currentOfferedPartner: null,
        },
        req,
      })
      
      // Requeue assignment through strategy
      try {
        await getAssignmentStrategy().assign(id, payload)
      } catch (err: any) {
        payload.logger.error(`Error requeueing delivery assignment strategy: ${err.message}`)
      }
      
      return Response.json({ success: true, status: 'rejected' })
    }

    return Response.json({ success: false, reason: 'Invalid action' }, { status: 400 })
  }
}
