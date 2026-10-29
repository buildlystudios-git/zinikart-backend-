import type { PayloadRequest } from 'payload'
import { transformProductSummary } from '../transformers/product'

export const productListEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    const url = new URL(req.url || '', 'http://localhost:3000')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    let limit = parseInt(url.searchParams.get('limit') || '20', 10)
    if (limit > 50) limit = 50

    const q = url.searchParams.get('q')
    const category = url.searchParams.get('category')
    const brand = url.searchParams.get('brand')
    const sortParam = url.searchParams.get('sort')
    const isMasterTemplate = url.searchParams.get('isMasterTemplate') === 'true'

    const where: any = {
      and: [
        { isMasterTemplate: { equals: isMasterTemplate } },
        { _status: { equals: 'published' } },
        { deletedAt: { exists: false } },
      ],
    }

    if (q) {
      where.and.push({ title: { like: q } })
    }
    if (category) {
      where.and.push({ categories: { in: [category] } })
    }
    if (brand) {
      where.and.push({ brand: { equals: brand } })
    }

    let sort = '-createdAt'
    if (sortParam === 'price_asc') sort = 'priceInINR'
    if (sortParam === 'price_desc') sort = '-priceInINR'
    if (sortParam === 'newest') sort = '-createdAt'
    if (sortParam === 'rating') sort = '-averageRating'

    const products = await req.payload.find({
      collection: 'products',
      where,
      limit,
      page,
      sort,
      depth: 1, // Only populate shallow relationships (like brand/categories)
      req,
      overrideAccess: true, // No auth required for public product list
    })

    const formattedDocs = products.docs.map((doc) => transformProductSummary(doc))

    return Response.json({
      docs: formattedDocs,
      pagination: {
        page: products.page,
        limit: products.limit,
        totalDocs: products.totalDocs,
        totalPages: products.totalPages,
        hasNextPage: products.hasNextPage,
      },
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in mobile product list endpoint: ${err.message}`)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
