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
        overrideAccess: true,
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

      if (retailers.size === 1) {
        const retailerUserId = Array.from(retailers)[0]
        
        // Find the retailers profile linked to this user
        const retailerProfileDocs = await payload.find({
          collection: 'retailers',
          where: { user: { equals: retailerUserId } },
          depth: 0,
          overrideAccess: true,
          req,
        })
        
        const profileId = retailerProfileDocs.docs[0]?.id
        if (!profileId) {
          throw new APIError('Retailer profile not found for this product.', 400)
        }

        if (!data.retailer) {
          data.retailer = profileId
        } else {
          const clientPassedId = typeof data.retailer === 'object' ? data.retailer.id : data.retailer
          // Client might have passed the user ID or the profile ID
          if (clientPassedId !== profileId && clientPassedId !== retailerUserId) {
            throw new APIError('The items in the order do not match the specified retailer.', 400)
          }
          // Always normalize data.retailer to be the retailers profile ID
          data.retailer = profileId
        }
      }
    }
  }
  return data
}
