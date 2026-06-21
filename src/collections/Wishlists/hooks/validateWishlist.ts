import { ValidationError } from 'payload'
import type { CollectionBeforeValidateHook } from 'payload'

export const validateWishlist: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (data?.product) {
    const customerId = data.customer || req.user?.id
    const productId = data.product

    // 1. Check if the product exists and has isMasterTemplate: false
    let product: any = null
    try {
      product = await req.payload.findByID({
        collection: 'products',
        id: productId,
        req,
        depth: 0,
        overrideAccess: true,
      })
    } catch (err) {
      throw new ValidationError({
        errors: [
          {
            message: 'Product not found.',
            path: 'product',
          },
        ],
      })
    }

    if (!product) {
      throw new ValidationError({
        errors: [
          {
            message: 'Product not found.',
            path: 'product',
          },
        ],
      })
    }

    if (product.isMasterTemplate === true) {
      throw new ValidationError({
        errors: [
          {
            message: 'Cannot add master template to wishlist.',
            path: 'product',
          },
        ],
      })
    }

    // 2. Enforce uniqueness on create
    if (operation === 'create' && customerId) {
      const existing = await req.payload.find({
        collection: 'wishlists',
        where: {
          and: [
            { customer: { equals: customerId } },
            { product: { equals: productId } },
          ],
        },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        throw new ValidationError({
          errors: [
            {
              message: 'This product is already in your wishlist.',
              path: 'product',
            },
          ],
        })
      }
    }
  }

  return data
}
