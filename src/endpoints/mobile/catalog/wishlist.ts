import type { PayloadRequest } from 'payload'
import { transformProductDetail } from '../transformers/product'

export const wishlistEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url || '', 'http://localhost:3000')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    let limit = parseInt(url.searchParams.get('limit') || '20', 10)
    if (limit > 50) limit = 50

    // Fetch user's wishlist entries
    const wishlistRes = await req.payload.find({
      collection: 'wishlists',
      where: {
        customer: { equals: req.user.id },
      },
      limit,
      page,
      sort: '-createdAt', // Newest additions first
      depth: 0,
      req,
    })

    const productIds = wishlistRes.docs
      .map((item: any) => (typeof item.product === 'object' ? item.product.id : item.product))
      .filter(Boolean)

    if (productIds.length === 0) {
      return Response.json({
        docs: [],
        pagination: {
          page: wishlistRes.page,
          limit: wishlistRes.limit,
          totalDocs: wishlistRes.totalDocs,
          totalPages: wishlistRes.totalPages,
          hasNextPage: wishlistRes.hasNextPage,
        },
      })
    }

    // Fetch variant types map once
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
    } catch {
      // Ignore if collection doesn't exist
    }

    // Query those specific products
    const productsRes = await req.payload.find({
      collection: 'products',
      where: {
        and: [
          { id: { in: productIds } },
          { _status: { equals: 'published' } },
        ],
      },
      limit: 1000, // Fetch all matched IDs
      depth: 4, // Depth 4 is required to fully populate variants and relationships for detail transformer
      overrideAccess: true,
      req,
    })

    // Map back products to maintain wishlist sorting order
    const productsMap = new Map()
    productsRes.docs.forEach((p: any) => productsMap.set(String(p.id), p))

    const formattedDocs = productIds
      .map((pid: string) => {
        const product = productsMap.get(String(pid))
        if (!product) return null
        return transformProductDetail(product, variantTypesMap)
      })
      .filter(Boolean)

    return Response.json({
      docs: formattedDocs,
      pagination: {
        page: wishlistRes.page,
        limit: wishlistRes.limit,
        totalDocs: wishlistRes.totalDocs,
        totalPages: wishlistRes.totalPages,
        hasNextPage: wishlistRes.hasNextPage,
      },
    })
  } catch (err: any) {
    req.payload.logger.error({ err }, '[mobile/products/wishlist] Error fetching wishlist')
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
