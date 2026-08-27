import type { Endpoint } from 'payload'
import { transformProductDetail } from '../mobile/transformers/product'

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

      const retailer = docs.docs[0]

      const url = new URL(req.url || '', 'http://localhost:3000')
      const page = parseInt(url.searchParams.get('page') || '1', 10)
      let limit = parseInt(url.searchParams.get('limit') || '20', 10)
      if (limit > 100) limit = 100

      const q = url.searchParams.get('q')
      const category = url.searchParams.get('category')
      const brand = url.searchParams.get('brand')
      const sortParam = url.searchParams.get('sort')
      const inventoryStatus = url.searchParams.get('inventoryStatus')

      const where: any = {
        and: [
          { retailer: { equals: req.user.id } },
          { deletedAt: { exists: false } }
        ]
      }

      if (q) where.and.push({ title: { like: q } })
      if (category) where.and.push({ categories: { in: [category] } })
      if (brand) where.and.push({ brand: { equals: brand } })

      let sort = '-createdAt'
      if (sortParam === 'price_asc') sort = 'priceInINR'
      if (sortParam === 'price_desc') sort = '-priceInINR'
      if (sortParam === 'newest') sort = '-createdAt'
      if (sortParam === 'rating') sort = '-averageRating'

      let finalProducts: any[] = []
      let totalDocs = 0
      let totalPages = 0
      let hasNextPage = false

      if (inventoryStatus) {
        // If filtering by inventory, we must fetch all matching products to calculate variant stock
        const allProductsQuery = await req.payload.find({
          collection: 'products',
          where,
          limit: 10000,
          sort,
          depth: 4,
          req,
        })
        let allProducts = allProductsQuery.docs

        const productsWithVariants = allProducts.filter((p) => p.enableVariants)
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
        for (const p of allProducts) {
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

        allProducts = allProducts.filter((p) => {
          const stock = stockMap.get(p.id) || 0
          if (inventoryStatus === 'in-stock') return stock > 0
          if (inventoryStatus === 'out-of-stock') return stock === 0
          if (inventoryStatus === 'low-stock') return stock > 0 && stock <= 5
          return true
        })

        totalDocs = allProducts.length
        totalPages = Math.ceil(totalDocs / limit)
        hasNextPage = page < totalPages

        const startIndex = (page - 1) * limit
        finalProducts = allProducts.slice(startIndex, startIndex + limit)

      } else {
        // Standard database pagination
        const productsQuery = await req.payload.find({
          collection: 'products',
          where,
          limit,
          page,
          sort,
          depth: 4,
          req,
        })
        finalProducts = productsQuery.docs
        totalDocs = productsQuery.totalDocs
        totalPages = productsQuery.totalPages
        hasNextPage = productsQuery.hasNextPage
      }

      let variantTypesMap: Record<string, string> = {}
      try {
        const typesRes = await req.payload.find({
          collection: 'variantTypes',
          limit: 1000,
          overrideAccess: true,
          req,
        })
        typesRes.docs.forEach((t: any) => {
          variantTypesMap[t.id] = t.name || t.label || 'Option'
        })
      } catch (err) {
        // Ignore if collection doesn't exist
      }

      const formattedDocs = finalProducts.map(p => transformProductDetail(p, variantTypesMap))

      return Response.json({
        success: true,
        retailer,
        products: formattedDocs,
        pagination: {
          page,
          limit,
          totalDocs,
          totalPages,
          hasNextPage,
        }
      })
    } catch (err: any) {
      req.payload.logger.error({ err }, 'Error fetching retailer me')
      return Response.json({ success: false, reason: err.message }, { status: 500 })
    }
  }
}
