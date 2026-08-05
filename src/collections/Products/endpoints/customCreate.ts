import { Endpoint } from 'payload'
import { toKebabCase } from '@/utilities/toKebabCase'
import { randomUUID } from 'crypto'

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

      req.payload.logger.info(`[customCreate] Received payload: ${JSON.stringify(body, null, 2)}`)

      const { id, title, parentTemplate, variants, priceInINR, inventory, ...otherData } = body

      if (!id && !title) {
        req.payload.logger.error(`[customCreate] Missing required field: title for creation`)
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
          const baseSlug = toKebabCase(title)
          productData.slug = `${baseSlug}-${randomUUID()}`
        }
      }

      req.payload.logger.info(`[customCreate] productData before create/update: ${JSON.stringify(productData, null, 2)}`)

      // Create or Update the product.
      let savedProduct
      if (id) {
        req.payload.logger.info(`[customCreate] Updating product with ID: ${id}`)
        savedProduct = await req.payload.update({
          collection: 'products',
          id,
          data: productData,
          req,
          overrideAccess: true,
        })
      } else {
        req.payload.logger.info(`[customCreate] Creating new product...`)
        savedProduct = await req.payload.create({
          collection: 'products',
          data: productData,
          req,
          overrideAccess: true,
        })
      }
      
      req.payload.logger.info(`[customCreate] Product saved with ID: ${savedProduct.id}`)

      const savedVariants = []

      // If variants are provided, update or create them linked to the product.
      if (hasVariants) {
        for (const variant of variants) {
          
          // Resolve option strings (like "opt_red") to database IDs
          const resolvedOptions = []
          for (const opt of variant.options || []) {
            const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(opt)
            if (isUUID) {
              resolvedOptions.push(opt)
            } else {
              const optionDoc = await req.payload.find({
                collection: 'variantOptions',
                where: { value: { equals: opt } },
                limit: 1,
              })
              if (optionDoc.docs.length > 0) {
                resolvedOptions.push(optionDoc.docs[0].id)
              } else {
                req.payload.logger.info(`[customCreate] Auto-creating missing variantOption for: ${opt}`)
                try {
                  const newOption = await req.payload.create({
                    collection: 'variantOptions',
                    data: {
                      label: opt,
                      value: opt,
                    } as any,
                    req,
                    overrideAccess: true,
                  })
                  resolvedOptions.push(newOption.id)
                } catch (err: any) {
                  throw new Error(`Failed to auto-create variant option "${opt}". It might require a variantType or other fields: ${err.message}`)
                }
              }
            }
          }

          const variantData = {
            product: savedProduct.id,
            options: resolvedOptions,
            inventory: variant.inventory,
            priceInINR: variant.priceInINR,
            ...variant.otherData,
          }

          let savedVariant
          if (variant.id) {
            req.payload.logger.info(`[customCreate] Updating variant ID: ${variant.id} with options: ${JSON.stringify(variant.options)}`)
            savedVariant = await req.payload.update({
              collection: 'variants',
              id: variant.id,
              data: variantData,
              req,
              overrideAccess: true,
            })
            req.payload.logger.info(`[customCreate] Successfully updated variant: ${savedVariant.id}`)
          } else {
            req.payload.logger.info(`[customCreate] Creating new variant with options: ${JSON.stringify(variant.options)}`)
            savedVariant = await req.payload.create({
              collection: 'variants',
              data: variantData,
              req,
              overrideAccess: true,
            })
            req.payload.logger.info(`[customCreate] Successfully created new variant: ${savedVariant.id}`)
          }

          savedVariants.push(savedVariant)
        }
      }

      req.payload.logger.info(`[customCreate] Endpoint execution completed successfully.`)

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
      if (error.stack) {
        req.payload.logger.error(`Stack trace: ${error.stack}`)
      }
      
      // Payload validation errors are often in error.data
      const validationDetails = error.data || []
      req.payload.logger.error(`Validation details: ${JSON.stringify(validationDetails, null, 2)}`)

      return Response.json(
        { 
          error: 'An error occurred while creating the product', 
          message: error.message,
          details: validationDetails,
          stack: error.stack 
        },
        { status: error.status || 500 }
      )
    }
  },
}
