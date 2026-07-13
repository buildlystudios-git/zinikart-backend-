import { isAuthenticated } from '@/access/isAuthenticated'
import type { Endpoint } from 'payload'
import { extractOtpFromBody } from './otpMiddleware'

export const statusUpdateEndpoint: Endpoint = {
  path: '/:id/status-update',
  method: 'post',
  handler: async (req) => {
    if (!isAuthenticated({ req } as any)) return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })

    const { id } = req.routeParams as { id: string }
    const body = typeof req.json === 'function' ? await req.json() : req.body
    const { status } = body
    const payload = req.payload

    if (!status) {
      return Response.json({ success: false, reason: 'Status is required' }, { status: 400 })
    }

    try {
      const order = await payload.findByID({ collection: 'orders', id, depth: 0, req })
      if (!order) return Response.json({ success: false, reason: 'Not found' }, { status: 404 })

      // Basic role-based access logic (could be more robust based on orderUpdateAccess)
      let changeSource = 'system'
      if (req?.user?.roles?.includes('retailer')) {
        const orderRetailerId = typeof order.retailer === 'object' && order.retailer ? order.retailer.id : order.retailer
        const retailers = await payload.find({
          collection: 'retailers',
          where: { user: { equals: req.user.id } },
          depth: 0,
          req,
        })
        if (retailers.docs.length === 0 || retailers.docs[0].id !== orderRetailerId) {
          return Response.json({ success: false, reason: 'Unauthorized' }, { status: 403 })
        }
        changeSource = 'retailer'
      } else if (req?.user?.roles?.includes('delivery_partner')) {
        const orderDeliveryPartnerId = typeof order.deliveryPartner === 'object' && order.deliveryPartner ? order.deliveryPartner.id : order.deliveryPartner
        const partners = await payload.find({
          collection: 'delivery-partners',
          where: { user: { equals: req.user.id } },
          depth: 0,
          req,
        })
        if (partners.docs.length === 0 || partners.docs[0].id !== orderDeliveryPartnerId) {
          return Response.json({ success: false, reason: 'Unauthorized' }, { status: 403 })
        }
        changeSource = 'delivery_partner'
      }

      const otpContext = extractOtpFromBody(body)

      await payload.update({
        collection: 'orders',
        id,
        data: { status },
        req,
        context: {
          ...otpContext,
          changeSource,
        },
      })

      return Response.json({ success: true, status })
    } catch (error: any) {
      return Response.json({ success: false, reason: error.message }, { status: 400 })
    }
  }
}
