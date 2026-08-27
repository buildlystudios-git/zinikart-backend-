import type { PayloadRequest } from 'payload'
import { transformProductDetail } from '../transformers/product'

export const reorderListEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url || '', 'http://localhost:3000')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    let limit = parseInt(url.searchParams.get('limit') || '20', 10)
    if (limit > 50) limit = 50

    // Fetch user's past orders
    // The ecommerce plugin uses either 'customer' or 'orderedBy' depending on version/config.
    const ordersRes = await req.payload.find({
      collection: 'orders',
      where: {
        or: [
          { customer: { equals: req.user.id } },
          { orderedBy: { equals: req.user.id } },
        ],
      },
      limit: 100, // Look at last 100 orders to find products
      depth: 0,
      req,
    })

    // Extract unique product IDs from these orders
    const productIds = new Set<string>()
    ordersRes.docs.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.product) {
            const pid = typeof item.product === 'object' ? item.product.id : item.product
            if (pid) productIds.add(String(pid))
          }
        })
      }
    })

    const uniqueProductIds = Array.from(productIds)

    if (uniqueProductIds.length === 0) {
      return Response.json({
        docs: [],
        pagination: {
          page: 1,
          limit,
          totalDocs: 0,
          totalPages: 1,
          hasNextPage: false,
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
          { id: { in: uniqueProductIds } },
          { _status: { equals: 'published' } },
          { deletedAt: { exists: false } },
        ],
      },
      limit,
      page,
      depth: 4, // Depth 4 is required to fully populate variants and relationships for detail transformer
      overrideAccess: true,
      req,
    })

    const formattedDocs = productsRes.docs
      .map((p) => transformProductDetail(p, variantTypesMap))
      .filter(Boolean)

    return Response.json({
      docs: formattedDocs,
      pagination: {
        page: productsRes.page,
        limit: productsRes.limit,
        totalDocs: productsRes.totalDocs,
        totalPages: productsRes.totalPages,
        hasNextPage: productsRes.hasNextPage,
      },
    })
  } catch (err: any) {
    req.payload.logger.error({ err }, '[mobile/products/reorder] Error fetching reorder list')
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
