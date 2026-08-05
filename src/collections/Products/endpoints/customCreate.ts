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
          const resolvedOptions: string[] = []
          // Resolve options from the new simplified `attributes` key-value format
          if (variant.attributes && typeof variant.attributes === 'object') {
            for (const [attrName, attrValue] of Object.entries(variant.attributes)) {
              if (typeof attrValue !== 'string') continue;
              
              // 1. Find or create the VariantType (e.g., "Color")
              let typeId;
              const typeDoc = await req.payload.find({
                collection: 'variantTypes',
                where: { name: { equals: attrName } },
                limit: 1,
              })
              
              if (typeDoc.docs.length > 0) {
                typeId = typeDoc.docs[0].id
              } else {
                req.payload.logger.info(`[customCreate] Auto-creating missing variantType: ${attrName}`)
                const newType = await req.payload.create({
                  collection: 'variantTypes',
                  data: { label: attrName, name: attrName } as any,
                  req,
                  overrideAccess: true,
                })
                typeId = newType.id
              }

              // 2. Find or create the VariantOption (e.g., "Red") linked to this type
              let optId;
              const optionDoc = await req.payload.find({
                collection: 'variantOptions',
                where: {
                  and: [
                    { value: { equals: attrValue } },
                    { variantType: { equals: typeId } },
                  ]
                },
                limit: 1,
              })
              
              if (optionDoc.docs.length > 0) {
                optId = optionDoc.docs[0].id
              } else {
                req.payload.logger.info(`[customCreate] Auto-creating missing variantOption for: ${attrValue} under type: ${attrName}`)
                const newOption = await req.payload.create({
                  collection: 'variantOptions',
                  data: {
                    label: attrValue,
                    value: attrValue,
                    variantType: typeId,
                  } as any,
                  req,
                  overrideAccess: true,
                })
                optId = newOption.id
              }
              
              if (!resolvedOptions.includes(optId)) {
                resolvedOptions.push(optId)
              }
            }
          }

          // Resolve legacy option strings (like "opt_red") from `options` array
          for (const opt of variant.options || []) {
            const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(opt)
            if (isUUID) {
              if (!resolvedOptions.includes(opt)) resolvedOptions.push(opt)
            } else {
              const optionDoc = await req.payload.find({
                collection: 'variantOptions',
                where: { value: { equals: opt } },
                limit: 1,
              })
              if (optionDoc.docs.length > 0) {
                if (!resolvedOptions.includes(optionDoc.docs[0].id)) {
                  resolvedOptions.push(optionDoc.docs[0].id)
                }
              } else {
                req.payload.logger.info(`[customCreate] Auto-creating missing legacy variantOption for: ${opt}`)
                try {
                  // Get the first variantType, or auto-create a default one.
                  let defaultVariantTypeId;
                  const types = await req.payload.find({ collection: 'variantTypes', limit: 1 })
                  if (types.docs.length > 0) {
                    defaultVariantTypeId = types.docs[0].id
                  } else {
                    const newType = await req.payload.create({
                      collection: 'variantTypes',
                      data: { label: 'Auto Generated Type', name: 'Auto Generated Type' } as any,
                      req,
                      overrideAccess: true,
                    })
                    defaultVariantTypeId = newType.id
                  }

                  const newOption = await req.payload.create({
                    collection: 'variantOptions',
                    data: {
                      label: opt,
                      value: opt,
                      variantType: defaultVariantTypeId,
                    } as any,
                    req,
                    overrideAccess: true,
                  })
                  if (!resolvedOptions.includes(newOption.id)) {
                    resolvedOptions.push(newOption.id)
                  }
                } catch (err: any) {
                  throw new Error(`Failed to auto-create legacy variant option "${opt}". ${err.message}`)
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
