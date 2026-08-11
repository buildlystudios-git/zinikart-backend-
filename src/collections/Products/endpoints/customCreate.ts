import { Endpoint } from 'payload'
import { toKebabCase } from '@/utilities/toKebabCase'
import { randomUUID } from 'crypto'
import { transformProductDetail } from '@/endpoints/mobile/transformers/product'

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

      const { id, title, parentTemplate, variants, priceInINR, inventory, status, price, description, discountedPrice, image, ...otherData } = body

      if (!id && !title) {
        req.payload.logger.error(`[customCreate] Missing required field: title for creation`)
        return Response.json({ error: 'Missing required field: title for creation' }, { status: 400 })
      }

      // Determine if variants are enabled.
      // On update: only override enableVariants if variants were explicitly sent.
      const hasVariants = Array.isArray(variants) && variants.length > 0
      const enableVariants = hasVariants ? true : (id ? undefined : false)

      // Prepare product payload
      // Other data can be passed, but the setTemplateFields hook will overwrite empty inherited fields.
      let lexicalDesc
      if (typeof description === 'string' && description.trim()) {
        lexicalDesc = {
          root: {
            type: "root",
            format: "",
            indent: 0,
            version: 1,
            children: [{
              type: "paragraph",
              format: "",
              indent: 0,
              version: 1,
              children: [{
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: description,
                type: "text",
                version: 1
              }]
            }]
          }
        }
      } else {
        lexicalDesc = description
      }

      const productData: any = {
        enableVariants,
        ...otherData,
      }
      
      // Only set parentTemplate if explicitly provided (avoid nulling it on partial updates)
      if (parentTemplate !== undefined) {
        productData.parentTemplate = parentTemplate || null
      }
      
      // Only set price/inventory for flat products and only if explicitly provided
      if (!hasVariants) {
        const resolvedPrice = priceInINR !== undefined ? priceInINR : price
        if (resolvedPrice !== undefined) productData.priceInINR = resolvedPrice
        if (inventory !== undefined) productData.inventory = inventory
      }
      
      if (status !== undefined) {
        productData._status = status;
      } else if (!id) {
        productData._status = 'published';
      }
      
      if (discountedPrice !== undefined) productData.discountedPrice = discountedPrice;
      if (lexicalDesc) productData.description = lexicalDesc;
      
      const newGalleryItems: any[] = [];
      if (image) {
        newGalleryItems.push({ image })
      }
      
      if (title) {
        productData.title = title
        // Only generate slug on CREATE, never overwrite slug on update
        if (!id && !productData.slug) {
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

          // Destructure variant to capture all specific fields and any extra data
          const { 
            id: variantId, 
            attributes, 
            options, 
            price, 
            priceInINR, 
            inventory, 
            image, 
            discountedPrice, 
            status, 
            ...variantOtherData 
          } = variant;

          const variantData: any = {
            product: savedProduct.id,
            inventory: inventory,
            priceInINR: priceInINR !== undefined ? priceInINR : price,
            ...variantOtherData,
          }
          if (resolvedOptions.length > 0) {
            variantData.options = resolvedOptions
          } else if (variantId) {
            // On update with no new attributes supplied, preserve the existing variant options
            // to avoid the ecommerce:variantOptionsRequired validation error
            const existingVariant = await req.payload.findByID({
              collection: 'variants',
              id: variantId,
              req,
              overrideAccess: true,
            })
            const existingOptionIds = (existingVariant.options || []).map((o: any) =>
              typeof o === 'object' ? o.id : o
            )
            if (existingOptionIds.length > 0) {
              variantData.options = existingOptionIds
            }
          }
          
          if (discountedPrice !== undefined) {
            variantData.discountedPrice = discountedPrice;
          }
          if (status !== undefined) {
            variantData._status = status;
          }
          
          if (image && resolvedOptions.length > 0) {
            newGalleryItems.push({
              image: image,
              variantOption: resolvedOptions[0]
            })
          }

          let savedVariant
          if (variantId) {
            req.payload.logger.info(`[customCreate] Updating variant ID: ${variantId} with options: ${JSON.stringify(resolvedOptions)}`)
            savedVariant = await req.payload.update({
              collection: 'variants',
              id: variantId,
              data: variantData,
              req,
              overrideAccess: true,
            })
            req.payload.logger.info(`[customCreate] Successfully updated variant: ${savedVariant.id}`)
          } else {
            req.payload.logger.info(`[customCreate] Creating new variant with options: ${JSON.stringify(resolvedOptions)}`)
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

      if (newGalleryItems.length > 0) {
        const existingGallery: any[] = savedProduct.gallery || []
        const existingImageIds = new Set(existingGallery.map((g: any) => 
          typeof g.image === 'object' ? g.image?.id : g.image
        ))
        const dedupedNewItems = newGalleryItems.filter(g => !existingImageIds.has(
          typeof g.image === 'object' ? g.image?.id : g.image
        ))
        if (dedupedNewItems.length > 0) {
          savedProduct = await req.payload.update({
            collection: 'products',
            id: savedProduct.id,
            data: {
              gallery: [...existingGallery, ...dedupedNewItems]
            },
            req,
            overrideAccess: true,
          })
        }
      }

      req.payload.logger.info(`[customCreate] Endpoint execution completed successfully.`)

      const fullyPopulatedProduct = await req.payload.findByID({
        collection: 'products',
        id: savedProduct.id,
        depth: 4,
        req,
        overrideAccess: true,
      })

      let variantTypesMap: Record<string, string> = {}
      try {
        const typesRes = await req.payload.find({
          collection: 'variantTypes',
          limit: 1000,
          overrideAccess: true,
          req,
        })
        typesRes.docs.forEach((t: any) => {
          variantTypesMap[t.id] = t.name || t.label || 'Option'
        })
      } catch (err) {
        // Ignore
      }

      return Response.json(
        {
          message: id ? 'Product updated successfully' : 'Product created successfully',
          product: transformProductDetail(fullyPopulatedProduct, variantTypesMap) || fullyPopulatedProduct,
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
