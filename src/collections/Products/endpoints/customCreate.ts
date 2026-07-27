import { Endpoint } from 'payload'

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

      const { title, parentTemplate, variants, priceInINR, inventory, ...otherData } = body

      if (!title) {
        return Response.json({ error: 'Missing required field: title' }, { status: 400 })
      }

      // Determine if variants are enabled
      const hasVariants = Array.isArray(variants) && variants.length > 0
      const enableVariants = hasVariants

      // Generate a unique slug from the title to prevent unique constraint errors
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`

      // Prepare product payload
      // Other data can be passed, but the setTemplateFields hook will overwrite empty inherited fields.
      const productData = {
        title,
        slug: uniqueSlug,
        parentTemplate: parentTemplate || null,
        enableVariants,
        priceInINR: !hasVariants ? priceInINR : undefined,
        inventory: !hasVariants ? inventory : undefined,
        ...otherData,
      }

      // Create the product.
      // We pass `req` so that `setTemplateFields` knows the user and can inherit master template fields.
      const newProduct = await req.payload.create({
        collection: 'products',
        data: productData,
        req,
      })

      const createdVariants = []

      // If variants are provided, create them linked to the new product.
      if (hasVariants) {
        for (const variant of variants) {
          const variantData = {
            product: newProduct.id,
            options: variant.options,
            inventory: variant.inventory,
            priceInINR: variant.priceInINR,
            ...variant.otherData,
          }

          const newVariant = await req.payload.create({
            collection: 'variants',
            data: variantData,
            req,
          })

          createdVariants.push(newVariant)
        }
      }

      return Response.json(
        {
          message: 'Product created successfully',
          product: newProduct,
          variants: createdVariants,
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
