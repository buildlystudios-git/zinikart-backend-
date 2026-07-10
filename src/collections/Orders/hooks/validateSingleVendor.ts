import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

export const validateSingleVendor: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  if (!data) return data
  
  if ((operation === 'create' || operation === 'update') && data.items?.length > 0) {
    const payload = req.payload
    
    const productIds = data.items.map((item: any) => 
      typeof item.product === 'object' ? item.product.id : item.product
    ).filter(Boolean)

    if (productIds.length > 0) {
      const products = await payload.find({
        collection: 'products',
        where: { id: { in: productIds } },
        depth: 0,
        req,
      })

      const retailers = new Set<string>()
      products.docs.forEach((product: any) => {
        if (product.retailer) {
          const retailerId = typeof product.retailer === 'object' ? product.retailer.id : product.retailer
          retailers.add(retailerId)
        }
      })

      if (retailers.size > 1) {
        throw new APIError('An order can only contain items from a single retailer.', 400)
      }

      if (retailers.size === 1 && !data.retailer) {
        data.retailer = Array.from(retailers)[0]
      } else if (retailers.size === 1 && data.retailer) {
        const orderRetailerId = typeof data.retailer === 'object' ? data.retailer.id : data.retailer
        if (orderRetailerId !== Array.from(retailers)[0]) {
          throw new APIError('The items in the order do not match the specified retailer.', 400)
        }
      }
    }
  }
  return data
}
