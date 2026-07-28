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
      
      const retailerId = docs.docs[0].id

      // Fetch products listed by this retailer (product.retailer references users collection)
      const productsQuery = await req.payload.find({
        collection: 'products',
        where: { retailer: { equals: req.user.id } },
        limit: 100, // Fetch up to 100 products initially, or allow pagination later
        req,
      })
      
      return Response.json({ 
        success: true, 
        retailer: docs.docs[0],
        products: productsQuery.docs 
      })
    } catch (err: any) {
      req.payload.logger.error({ err }, 'Error fetching retailer me')
      return Response.json({ success: false, reason: err.message }, { status: 500 })
    }
  }
}
