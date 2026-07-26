import type { Endpoint } from 'payload'

export const retailerMeEndpoint: Endpoint = {
  path: '/me',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    
    try {
      const docs = await req.payload.find({
        collection: 'retailers',
        where: { user: { equals: req.user.id } },
        limit: 1,
        req,
      })
      
      if (!docs.docs.length) {
        return Response.json({ success: false, reason: 'Retailer profile not found' }, { status: 404 })
      }
      
      return Response.json({ success: true, retailer: docs.docs[0] })
    } catch (err: any) {
      req.payload.logger.error({ err }, 'Error fetching retailer me')
      return Response.json({ success: false, reason: err.message }, { status: 500 })
    }
  }
}
