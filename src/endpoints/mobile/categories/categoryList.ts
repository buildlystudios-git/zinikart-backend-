import type { PayloadRequest } from 'payload'
import { transformCategory } from '../transformers/category'

export const categoryListEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    const categories = await req.payload.find({
      collection: 'categories',
      limit: 100, // Usually categories are limited in number
      depth: 1, // To get media URL
      sort: 'title',
      req,
      overrideAccess: true,
    })

    const formattedDocs = categories.docs.map(transformCategory)

    return Response.json({
      docs: formattedDocs,
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in mobile category list endpoint: ${err.message}`)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
