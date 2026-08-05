import { Endpoint } from 'payload'
import { toKebabCase } from '@/utilities/toKebabCase'

export const customCreateEndpoint: Endpoint = {
  path: '/custom-create',
  method: 'post',
  handler: async (req) => {
    try {
      // Must be authenticated
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      let body
      if (req.json && typeof req.json === 'function') {
        body = await req.json()
      } else {
        body = (req as any).body || {}
      }

      const { id, title, parentTemplate, variants, priceInINR, inventory, ...otherData } = body

      if (!id && !title) {
        return Response.json({ error: 'Missing required field: title for creation' }, { status: 400 })
      }

      // Determine if variants are enabled
      const hasVariants = Array.isArray(variants) && variants.length > 0
      const enableVariants = hasVariants

      // Prepare product payload
      // Other data can be passed, but the setTemplateFields hook will overwrite empty inherited fields.
      const productData: any = {
        parentTemplate: parentTemplate || null,
        enableVariants,
        priceInINR: !hasVariants ? priceInINR : undefined,
        inventory: !hasVariants ? inventory : undefined,
        ...otherData,
      }
      
      if (title) {
        productData.title = title
        if (!productData.slug) {
          productData.slug = toKebabCase(title)
        }
      }

      // Create or Update the product.
      let savedProduct
      if (id) {
        savedProduct = await req.payload.update({
          collection: 'products',
          id,
          data: productData,
          req,
        })
      } else {
        savedProduct = await req.payload.create({
          collection: 'products',
          data: productData,
          req,
        })
      }

      const savedVariants = []

      // If variants are provided, update or create them linked to the product.
      if (hasVariants) {
        for (const variant of variants) {
          const variantData = {
            product: savedProduct.id,
            options: variant.options,
            inventory: variant.inventory,
            priceInINR: variant.priceInINR,
            ...variant.otherData,
          }

          let savedVariant
          if (variant.id) {
            savedVariant = await req.payload.update({
              collection: 'variants',
              id: variant.id,
              data: variantData,
              req,
            })
          } else {
            savedVariant = await req.payload.create({
              collection: 'variants',
              data: variantData,
              req,
            })
          }

          savedVariants.push(savedVariant)
        }
      }

      return Response.json(
        {
          message: id ? 'Product updated successfully' : 'Product created successfully',
          product: savedProduct,
          variants: savedVariants,
        },
        { status: 201 }
      )
    } catch (error: any) {
      req.payload.logger.error(`customCreateEndpoint error: ${error.message || error}`)
      return Response.json(
        { error: 'An error occurred while creating the product', details: error.message },
        { status: 500 }
      )
    }
  },
}
