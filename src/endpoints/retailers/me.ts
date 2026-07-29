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
      let finalProducts = productsQuery.docs

      const url = new URL(req.url || '', 'http://localhost:3000')
      const inventoryStatus = url.searchParams.get('inventoryStatus')

      if (inventoryStatus) {
        const productsWithVariants = finalProducts.filter((p) => p.enableVariants)
        const variantProductIds = productsWithVariants.map((p) => p.id)
        
        let variantsRes = { docs: [] as any[] }
        if (variantProductIds.length > 0) {
          variantsRes = await req.payload.find({
            collection: 'variants',
            where: { product: { in: variantProductIds } },
            limit: 10000,
            depth: 0,
            req,
          })
        }

        const stockMap = new Map<string | number, number>()
        for (const p of finalProducts) {
          if (!p.enableVariants) {
            stockMap.set(p.id, p.inventory || 0)
          } else {
            stockMap.set(p.id, 0)
          }
        }
        for (const v of variantsRes.docs) {
          const pid = typeof v.product === 'object' ? v.product.id : v.product
          if (pid) {
            stockMap.set(pid, (stockMap.get(pid) || 0) + (v.inventory || 0))
          }
        }

        finalProducts = finalProducts.filter((p) => {
          const stock = stockMap.get(p.id) || 0
          if (inventoryStatus === 'in-stock') return stock > 0
          if (inventoryStatus === 'out-of-stock') return stock === 0
          if (inventoryStatus === 'low-stock') return stock > 0 && stock <= 5
          return true
        })
      }
      
      return Response.json({ 
        success: true, 
        retailer: docs.docs[0],
        products: finalProducts 
      })
    } catch (err: any) {
      req.payload.logger.error({ err }, 'Error fetching retailer me')
      return Response.json({ success: false, reason: err.message }, { status: 500 })
    }
  }
}
