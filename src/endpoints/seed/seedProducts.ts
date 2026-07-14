import type { Payload } from 'payload'
import fs from 'fs'
import path from 'path'
import { createLexicalDescription, fetchImageWithFallback } from './utils'
import { productSmartphoneVariant } from './product-smartphone'
import { productCameraData } from './product-camera'
import { productHeadphonesData } from './product-headphones'

export async function seedProducts(
  payload: Payload,
  selectedProducts: any[],
  brandDocMap: Record<string, any>,
  categories: { mobile: any, camera: any, headphones: any },
  uniqueStorageOptions: Set<string>,
  uniqueColors: Set<string>,
  images: { defaultImg: string, hatImg: string, whiteImg: string }
) {
  payload.logger.info(`— Seeding variant types and options...`)

  const storageType = await payload.create({ collection: 'variantTypes', data: { name: 'storage', label: 'Storage' } })
  const colorType = await payload.create({ collection: 'variantTypes', data: { name: 'color', label: 'Color' } })
  const kitType = await payload.create({ collection: 'variantTypes', data: { name: 'kit', label: 'Lens Kit' } })

  const storageOptionsMap: Record<string, any> = {}
  for (const s of Array.from(uniqueStorageOptions)) {
    storageOptionsMap[s] = (await payload.create({ collection: 'variantOptions', data: { label: s, value: s.toLowerCase(), variantType: storageType.id } })).id
  }
  
  const colorsOptionsMap: Record<string, any> = {}
  for (const c of Array.from(uniqueColors)) {
    colorsOptionsMap[c] = (await payload.create({ collection: 'variantOptions', data: { label: c, value: c.toLowerCase(), variantType: colorType.id } })).id
  }
  
  // Ensure required static options exist
  const requiredColors = ['Black', 'White', 'Silver', 'Gold', 'Blue']
  for (const c of requiredColors) {
    if (!colorsOptionsMap[c]) {
      colorsOptionsMap[c] = (await payload.create({ collection: 'variantOptions', data: { label: c, value: c.toLowerCase(), variantType: colorType.id } })).id
    }
  }
  const requiredStorage = ['64GB', '128GB', '256GB', '512GB']
  for (const s of requiredStorage) {
    if (!storageOptionsMap[s]) {
      storageOptionsMap[s] = (await payload.create({ collection: 'variantOptions', data: { label: s, value: s.toLowerCase(), variantType: storageType.id } })).id
    }
  }

  const opt128GB = storageOptionsMap['128GB']
  const opt256GB = storageOptionsMap['256GB']
  const opt512GB = storageOptionsMap['512GB']
  const optBlack = colorsOptionsMap['Black']
  const optWhite = colorsOptionsMap['White']
  const optGold = colorsOptionsMap['Gold']
  const optSilver = colorsOptionsMap['Silver']
  const optBlue = colorsOptionsMap['Blue']

  const optBodyOnly = await payload.create({ collection: 'variantOptions', data: { label: 'Body Only', value: 'body-only', variantType: kitType.id } })
  const optLensKit = await payload.create({ collection: 'variantOptions', data: { label: '24-70mm Lens Kit', value: 'lens-kit', variantType: kitType.id } })

  const masterProducts: any[] = []
  const usedSlugs = new Set<string>()

  payload.logger.info(`— Seeding ${selectedProducts.length} mobile master templates...`)
  let productSmartphone: any = null

  for (const item of selectedProducts) {
    let ramNum = parseInt((item.ram || '').match(/\d+/)?.[0] || '8', 10)
    let storage = (item.internal_storage || '').trim().replace(/\s+/g, '')
    if (!storage) storage = '128GB'
    const brandName = item.brand?.trim().toLowerCase()
    
    let slugBase = (item.model || 'Unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    let productSlug = slugBase
    let counter = 2
    while (usedSlugs.has(productSlug)) {
      productSlug = `${slugBase}-${counter}`
      counter++
    }
    usedSlugs.add(productSlug)

    const colorsList = Array.from(new Set<string>((item.colors || '').split(',').map((c: string) => c.trim()).filter(Boolean) as string[]))
    const imageId = await fetchImageWithFallback(payload, item.image_url, images.defaultImg)
    const price = 15000 + Math.floor(Math.random() * 85000)

    let createdProduct;
    try {
      createdProduct = await payload.create({
        collection: 'products',
        depth: 0,
        data: {
          title: item.model || 'Unknown',
          slug: productSlug,
          _status: 'published',
          brand: brandDocMap[brandName]?.id,
          categories: [categories.mobile.id],
          priceInINREnabled: true,
          priceInINR: price * 100, // Paise
          inventory: 100,
          discountPercent: 10,
          isMasterTemplate: true,
          parentTemplate: null,
          enableVariants: colorsList.length > 0,
          variantTypes: colorsList.length > 0 ? [colorType.id, storageType.id] : undefined,
          description: createLexicalDescription(`${item.brand} smartphone with ${item.operating_system || 'Android'}.`),
          specifications: [
            { key: 'RAM', value: String(ramNum), type: 'number' },
            { key: 'Storage', value: storage, type: 'select' },
            { key: 'Display', value: item.display_type, type: 'text' },
            { key: 'Screen Size', value: item.screen_size, type: 'text' },
            { key: 'Resolution', value: item.resolution, type: 'text' },
            { key: 'Battery', value: item.battery_capacity, type: 'text' },
            { key: 'OS', value: item.operating_system, type: 'text' },
            { key: 'Processor', value: item.chipset, type: 'text' },
            { key: 'Camera', value: item.primary_camera_resolution, type: 'text' },
          ].filter(s => s.value) as { key: string; value: string; type: 'number' | 'select' | 'text' | 'date' }[],
          gallery: [{ image: imageId as string }],
          meta: {
            title: `${item.model} | ZiniKart`,
            description: `${item.brand} smartphone`,
            image: imageId as string,
          },
        },
      })
    } catch (err) {
      payload.logger.error(`Failed to create product ${productSlug}: ${err}`)
      continue
    }
    
    if (!productSmartphone && brandDocMap[brandName]?.name === 'Apple') {
      productSmartphone = createdProduct
    }
    masterProducts.push(createdProduct)

    // Seed Variants (max 4)
    if (colorsList.length > 0) {
      const colorsToCreate = colorsList.slice(0, 4)
      const storageOpt = storageOptionsMap[storage]
      
      for (const color of colorsToCreate) {
        const colorOpt = colorsOptionsMap[color]
        if (!colorOpt || !storageOpt) continue
        
        try {
          await payload.create({
            collection: 'variants',
            depth: 0,
            data: productSmartphoneVariant({
              product: createdProduct,
              variantOptions: [colorOpt, storageOpt], // pass the IDs
              inventory: 15,
              priceInINR: price * 100,
            }),
          })
        } catch (err) {
          payload.logger.error(`Failed to create variant for product ${productSlug}: ${err}`)
        }
      }
    }
  }

  // Seeding Camera & Headphones Master Templates statically
  const cameraTemplates = [
    { model: 'Alpha 7 IV', brand: brandDocMap['sony'], price: 219900, megapixels: 33, sensor: 'Full-Frame CMOS', desc: 'Sony hybrid mirrorless camera with advanced autofocus.' },
    { model: 'EOS R5', brand: brandDocMap['canon'], price: 329900, megapixels: 45, sensor: 'Full-Frame CMOS', desc: 'Canon flagship mirrorless with 8K video capability.' },
  ]
  const productCamera = await payload.create({
    collection: 'products',
    depth: 0,
    data: productCameraData({
      galleryImage: images.hatImg as any,
      variantTypes: [colorType.id as any, kitType.id as any],
      categories: [categories.camera.id as any],
      relatedProducts: [],
    }) as any,
  })
  if (brandDocMap['sony']) {
    await payload.update({
      collection: 'products',
      id: productCamera.id,
      data: { brand: brandDocMap['sony'].id }
    })
  }
  masterProducts.push(productCamera)

  for (const c of cameraTemplates) {
    if (c.model === 'Alpha 7 IV') continue
    const cp = await payload.create({
      collection: 'products',
      depth: 0,
      data: {
        title: c.model,
        slug: c.model.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        _status: 'published',
        brand: c.brand?.id,
        categories: [categories.camera.id],
        priceInINREnabled: true,
        priceInINR: c.price * 100,
        inventory: 100,
        discountPercent: 20,
        isMasterTemplate: true,
        parentTemplate: null,
        description: createLexicalDescription(c.desc),
        specifications: [
          { key: 'Megapixels', value: String(c.megapixels), type: 'number' },
          { key: 'Sensor Size', value: c.sensor, type: 'text' },
        ],
        gallery: [{ image: images.hatImg }],
        meta: {
          title: `${c.model} | ZiniKart`,
          description: c.desc,
          image: images.hatImg,
        },
      },
    })
    masterProducts.push(cp)
  }

  const productHeadphones = await payload.create({
    collection: 'products',
    depth: 0,
    data: productHeadphonesData({
      galleryImage: images.hatImg as any,
      metaImage: images.hatImg as any,
      variantTypes: [colorType.id as any],
      categories: [categories.headphones.id as any],
      relatedProducts: [],
    }) as any,
  })
  if (brandDocMap['sony']) {
    await payload.update({
      collection: 'products',
      id: productHeadphones.id,
      data: { brand: brandDocMap['sony'].id }
    })
  }
  masterProducts.push(productHeadphones)

  // Seed static variants
  await Promise.all([
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productCamera,
        variantOptions: [optBlack, optBodyOnly],
        inventory: 8,
        priceInINR: 219900,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productHeadphones,
        variantOptions: [optBlack],
        inventory: 20,
        priceInINR: 14900,
      }),
    }),
  ])

  payload.logger.info(`— Updating related products...`)
  const productsByBrand: Record<string, any[]> = {}
  for (const p of masterProducts) {
    const b = String(p.brand)
    if (!productsByBrand[b]) productsByBrand[b] = []
    productsByBrand[b].push(p)
  }

  for (const p of masterProducts) {
    const b = String(p.brand)
    const related = productsByBrand[b].filter((rp) => rp.id !== p.id).slice(0, 4)
    if (related.length > 0) {
      await payload.update({
        collection: 'products',
        id: p.id,
        data: {
          relatedProducts: related.map((rp) => rp.id),
        },
      })
    }
  }

  return { productSmartphone, productCamera, productHeadphones }
}
