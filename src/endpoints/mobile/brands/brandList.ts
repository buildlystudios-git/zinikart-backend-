import type { PayloadRequest } from 'payload'
import { transformBrand } from '../transformers/brand'

export const brandListEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    const url = new URL(req.url || '', 'http://localhost:3000')
    const category = url.searchParams.get('category')

    const where: any = {}
    if (category) {
      where.categories = { in: [category] }
    }

    const brands = await req.payload.find({
      collection: 'brands',
      where,
      limit: 200, // Fetch plenty to list all brands
      depth: 1, // To get logo URL
      sort: 'name',
      req,
      overrideAccess: true,
    })

    const formattedDocs = brands.docs.map(transformBrand)

    return Response.json({
      docs: formattedDocs,
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in mobile brand list endpoint: ${err.message}`)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
