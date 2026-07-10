import type { Endpoint } from 'payload'
import { LOCATION_THROTTLE_MS } from '@/constants/env'

export const locationTrackingEndpoint: Endpoint = {
  path: '/location',
  method: 'patch',
  handler: async (req) => {
    if (!req.user) return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    
    const payload = req.payload
    const partners = await payload.find({
      collection: 'delivery-partners',
      where: { user: { equals: req.user.id } },
      depth: 0,
      req,
    })
    
    if (partners.docs.length === 0) return Response.json({ success: false, reason: 'Not a delivery partner' }, { status: 403 })
    
    const partner = partners.docs[0]
    
    if (!partner.onlineStatus) {
      return Response.json({ success: false, reason: 'Partner is offline' }, { status: 400 })
    }

    const lastUpdate = partner.lastLocationUpdatedAt ? new Date(partner.lastLocationUpdatedAt).getTime() : 0
    if (Date.now() - lastUpdate < LOCATION_THROTTLE_MS) {
      return Response.json({ success: false, reason: 'Too frequent location updates' }, { status: 429 })
    }

    const { lat, lng } = typeof req.json === 'function' ? await req.json() : req.body
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return Response.json({ success: false, reason: 'Invalid coordinates' }, { status: 400 })
    }

    await payload.update({
      collection: 'delivery-partners',
      id: partner.id,
      data: {
        lat,
        lng,
        lastLocationUpdatedAt: new Date().toISOString()
      },
      req,
    })
    
    return Response.json({ success: true })
  }
}
