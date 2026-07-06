import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest, File } from 'payload'
import fs from 'fs'
import path from 'path'

import { contactFormData } from './contact-form'
import { contactPageData } from './contact-page'
import { productHeadphonesData } from './product-headphones'
import { productSmartphoneData, productSmartphoneVariant } from './product-smartphone'
import { productCameraData } from './product-camera'
import { homePageData } from './home'
import { headphonesMediaData, smartphoneBlackMediaData, smartphoneWhiteMediaData } from './media-metadata'
import { imageHero1Data } from './image-hero-1'
import { Address, Transaction, VariantOption } from '@/payload-types'

const collections: CollectionSlug[] = [
  'ratings',
  'wishlists',
  'orders',
  'carts',
  'transactions',
  'addresses',
  'delivery-partners',
  'retailers',
  'variants',
  'products',
  'variantOptions',
  'variantTypes',
  'pages',
  'forms',
  'form-submissions',
  'categories',
  'brands',
  'media',
]

const globals: GlobalSlug[] = ['header', 'footer']

const baseAddressUSData: Transaction['billingAddress'] = {
  title: 'Dr.',
  firstName: 'Otto',
  lastName: 'Octavius',
  phone: '1234567890',
  company: 'Oscorp',
  addressLine1: '123 Main St',
  addressLine2: 'Suite 100',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  lat: 40.7128,
  lng: -74.0060,
}

const baseAddressUKData: Transaction['billingAddress'] = {
  title: 'Mr.',
  firstName: 'Oliver',
  lastName: 'Twist',
  phone: '1234567890',
  addressLine1: '48 Great Portland St',
  city: 'London',
  postalCode: 'W1W 7ND',
  country: 'GB',
  lat: 51.5074,
  lng: -0.1278,
}

// Next.js revalidation errors are normal when seeding the database without a server running
// i.e. running `yarn seed` locally instead of using the admin UI within an active app
// The app is not running to revalidate the pages and so the API routes are not available
// These error messages can be ignored: `Error hitting revalidate route for...`
export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding database...')

  // we need to clear the media directory before seeding
  // as well as the collections and globals
  // this is because while `yarn seed` drops the database
  // the custom `/api/seed` endpoint does not
  payload.logger.info(`— Clearing collections and globals...`)

  // clear the database
  await Promise.all(
    globals.map((global) =>
      payload.updateGlobal({
        slug: global,
        data: {
          navItems: [],
        },
        depth: 0,
        context: {
          disableRevalidate: true,
        },
      }),
    ),
  )

  for (const collection of collections) {
    await payload.db.deleteMany({ collection, req, where: {} })
    if (payload.collections[collection].config.versions) {
      await payload.db.deleteVersions({ collection, req, where: {} })
    }
  }

  payload.logger.info(`— Seeding customer and customer data...`)

  await payload.delete({
    collection: 'users',
    depth: 0,
    where: {
      email: {
        in: ['customer@example.com', 'retailer@example.com', 'delivery@example.com'],
      },
    },
  })

  payload.logger.info(`— Seeding media...`)

  const [imageHatBuffer, imageTshirtBlackBuffer, imageTshirtWhiteBuffer, heroBuffer] =
    await Promise.all([
      fetchFileByURL(
        'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/3.x/templates/ecommerce/src/endpoints/seed/hat-logo.png',
      ),
      fetchFileByURL(
        'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/3.x/templates/ecommerce/src/endpoints/seed/tshirt-black.png',
      ),
      fetchFileByURL(
        'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/3.x/templates/ecommerce/src/endpoints/seed/tshirt-white.png',
      ),
      fetchFileByURL(
        'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/3.x/templates/website/src/endpoints/seed/image-hero1.webp',
      ),
    ])

  const [
    customer,
    retailerUser,
    deliveryPartnerUser,
    imageHat,
    imageTshirtBlack,
    imageTshirtWhite,
    imageHero,
  ] = await Promise.all([
    payload.create({
      collection: 'users',
      data: {
        name: 'Customer',
        email: 'customer@example.com',
        password: 'password',
        roles: ['customer'],
      },
    }),
    payload.create({
      collection: 'users',
      data: {
        name: 'Retailer User',
        email: 'retailer@example.com',
        password: 'password',
        roles: ['retailer'],
      },
    }),
    payload.create({
      collection: 'users',
      data: {
        name: 'Delivery Partner User',
        email: 'delivery@example.com',
        password: 'password',
        roles: ['customer'],
      },
    }),
    payload.create({
      collection: 'media',
      data: headphonesMediaData,
      file: imageHatBuffer,
    }),
    payload.create({
      collection: 'media',
      data: smartphoneBlackMediaData,
      file: imageTshirtBlackBuffer,
    }),
    payload.create({
      collection: 'media',
      data: smartphoneWhiteMediaData,
      file: imageTshirtWhiteBuffer,
    }),
    payload.create({
      collection: 'media',
      data: imageHero1Data,
      file: heroBuffer,
    }),
  ])

  // Load mobile phone dataset
  let dataset: any[] = []
  try {
    const datasetPath = path.resolve(process.cwd(), 'datasets/phones_data_20250729_022344.json')
    if (fs.existsSync(datasetPath)) {
      payload.logger.info(`— Reading dataset from ${datasetPath}...`)
      dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
    } else {
      payload.logger.warn(`Dataset file not found at ${datasetPath}`)
    }
  } catch (err) {
    payload.logger.error(`Failed to read dataset: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Pick 4 products for each of the 6 brands: Apple, Samsung, Oppo, Vivo, Realme, Motorola
  const targetBrands = ['apple', 'samsung', 'oppo', 'vivo', 'realme', 'motorola']
  const selectedProductsByBrand: Record<string, any[]> = {
    apple: [],
    samsung: [],
    oppo: [],
    vivo: [],
    realme: [],
    motorola: [],
  }

  for (const item of dataset) {
    const brandName = item.brand?.trim().toLowerCase()
    if (brandName && targetBrands.includes(brandName)) {
      const ramNum = parseInt(item.ram || '')
      const storage = (item.internal_storage || '').trim().replace(/\s+/g, '')
      if (!isNaN(ramNum) && storage && selectedProductsByBrand[brandName].length < 4) {
        selectedProductsByBrand[brandName].push(item)
      }
    }
  }

  // Collect unique storage values to set up Mobile category template options
  const uniqueStorageOptions = new Set<string>()
  for (const brandName of targetBrands) {
    for (const item of selectedProductsByBrand[brandName]) {
      const storage = (item.internal_storage || '').trim().replace(/\s+/g, '')
      if (storage) {
        uniqueStorageOptions.add(storage)
      }
    }
  }
  // Always include standard options to accommodate custom/refurbished devices
  uniqueStorageOptions.add('64GB')
  uniqueStorageOptions.add('128GB')
  uniqueStorageOptions.add('256GB')
  uniqueStorageOptions.add('512GB')

  // Create categories and brands
  const [
    mobileCategory,
    cameraCategory,
    headphonesCategory,
    appleBrand,
    samsungBrand,
    sonyBrand,
    oppoBrand,
    vivoBrand,
    realmeBrand,
    motorolaBrand,
    oneplusBrand,
    googleBrand,
    xiaomiBrand,
    fujifilmBrand,
    panasonicBrand,
    leicaBrand,
    goproBrand,
    omSystemBrand,
    canonBrand,
    nikonBrand,
  ] = await Promise.all([
    payload.create({
      collection: 'categories',
      data: {
        title: 'Mobile',
        slug: 'mobile',
        specificationTemplates: [
          { name: 'RAM', type: 'number', required: true },
          {
            name: 'Storage',
            type: 'select',
            options: Array.from(uniqueStorageOptions).map((opt) => ({ option: opt })),
            required: true,
          },
          { name: 'Release Date', type: 'date', required: false },
        ],
      },
    }),
    payload.create({
      collection: 'categories',
      data: {
        title: 'Camera',
        slug: 'camera',
        specificationTemplates: [
          { name: 'Megapixels', type: 'number', required: true },
          { name: 'Sensor Type', type: 'text', required: false },
        ],
      },
    }),
    payload.create({
      collection: 'categories',
      data: {
        title: 'Headphones',
        slug: 'headphones',
        specificationTemplates: [
          { name: 'Type', type: 'select', options: [{ option: 'In-Ear' }, { option: 'Over-Ear' }], required: true },
          { name: 'Wireless', type: 'select', options: [{ option: 'Yes' }, { option: 'No' }], required: true },
        ],
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Apple',
        slug: 'apple',
        description: 'Apple Inc. official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Samsung',
        slug: 'samsung',
        description: 'Samsung Electronics official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Sony',
        slug: 'sony',
        description: 'Sony Corporation official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Oppo',
        slug: 'oppo',
        description: 'Oppo official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Vivo',
        slug: 'vivo',
        description: 'Vivo official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Realme',
        slug: 'realme',
        description: 'Realme official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Motorola',
        slug: 'motorola',
        description: 'Motorola official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'OnePlus',
        slug: 'oneplus',
        description: 'OnePlus official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Google',
        slug: 'google',
        description: 'Google official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Xiaomi',
        slug: 'xiaomi',
        description: 'Xiaomi official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Fujifilm',
        slug: 'fujifilm',
        description: 'Fujifilm official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Panasonic',
        slug: 'panasonic',
        description: 'Panasonic official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Leica',
        slug: 'leica',
        description: 'Leica official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'GoPro',
        slug: 'gopro',
        description: 'GoPro official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'OM System',
        slug: 'om-system',
        description: 'OM System official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Canon',
        slug: 'canon',
        description: 'Canon official brand.',
        featured: true,
      },
    }),
    payload.create({
      collection: 'brands',
      data: {
        name: 'Nikon',
        slug: 'nikon',
        description: 'Nikon official brand.',
        featured: true,
      },
    }),
  ])

  payload.logger.info(`— Seeding variant types and options...`)

  const storageType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'storage', label: 'Storage' },
  })
  const colorType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'color', label: 'Color' },
  })
  const kitType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'kit', label: 'Lens Kit' },
  })

  const opt128GB = await payload.create({
    collection: 'variantOptions',
    data: { label: '128GB', value: '128gb', variantType: storageType.id },
  })
  const opt256GB = await payload.create({
    collection: 'variantOptions',
    data: { label: '256GB', value: '256gb', variantType: storageType.id },
  })
  const opt512GB = await payload.create({
    collection: 'variantOptions',
    data: { label: '512GB', value: '512gb', variantType: storageType.id },
  })

  const optBlack = await payload.create({
    collection: 'variantOptions',
    data: { label: 'Black', value: 'black', variantType: colorType.id },
  })
  const optWhite = await payload.create({
    collection: 'variantOptions',
    data: { label: 'White', value: 'white', variantType: colorType.id },
  })
  const optGold = await payload.create({
    collection: 'variantOptions',
    data: { label: 'Gold', value: 'gold', variantType: colorType.id },
  })
  const optSilver = await payload.create({
    collection: 'variantOptions',
    data: { label: 'Silver', value: 'silver', variantType: colorType.id },
  })
  const optBlue = await payload.create({
    collection: 'variantOptions',
    data: { label: 'Blue', value: 'blue', variantType: colorType.id },
  })

  const optBodyOnly = await payload.create({
    collection: 'variantOptions',
    data: { label: 'Body Only', value: 'body-only', variantType: kitType.id },
  })
  const optLensKit2870 = await payload.create({
    collection: 'variantOptions',
    data: { label: '28-70mm Lens Kit', value: '28-70mm', variantType: kitType.id },
  })
  const optLensKit50 = await payload.create({
    collection: 'variantOptions',
    data: { label: '50mm Prime Lens Kit', value: '50mm-prime', variantType: kitType.id },
  })

  payload.logger.info(`— Seeding products...`)

  const productHeadphones = await payload.create({
    collection: 'products',
    depth: 0,
    data: {
      ...productHeadphonesData({
        galleryImage: imageHat,
        metaImage: imageHat,
        variantTypes: [colorType],
        categories: [headphonesCategory],
        relatedProducts: [],
      }),
      brand: sonyBrand.id,
      isMasterTemplate: true,
      parentTemplate: null,
      inventory: 100,
      discountPercent: 10,
      description: createLexicalDescription('Premium noise-cancelling wireless headphones with custom color options.'),
    },
  })

  // Define predefined master templates lists
  const mobileTemplates = [
    { model: 'iPhone 15 Pro Max', brand: appleBrand, price: 159900, ram: 8, storage: '256GB', desc: 'Apple flagship with A17 Pro chip and titanium design.' },
    { model: 'Galaxy S24 Ultra', brand: samsungBrand, price: 129900, ram: 12, storage: '256GB', desc: 'Samsung flagship with Galaxy AI and Snapdragon 8 Gen 3.' },
    { model: 'OnePlus 12', brand: oneplusBrand, price: 64900, ram: 12, storage: '256GB', desc: 'Flagship killer with Snapdragon 8 Gen 3 and Hasselblad camera.' },
    { model: 'Pixel 8 Pro', brand: googleBrand, price: 109900, ram: 12, storage: '128GB', desc: 'Google flagship with Tensor G3 and advanced AI camera.' },
    { model: 'Xiaomi 14 Ultra', brand: xiaomiBrand, price: 99900, ram: 16, storage: '512GB', desc: 'Photography flagship with Leica quad camera system.' },
    { model: 'Find X7 Ultra', brand: oppoBrand, price: 84900, ram: 16, storage: '256GB', desc: 'Dual periscope camera flagship from Oppo.' },
    { model: 'X100 Pro', brand: vivoBrand, price: 89900, ram: 16, storage: '512GB', desc: 'Zeiss APO periscope camera flagship.' },
    { model: 'GT5 Pro', brand: realmeBrand, price: 54900, ram: 12, storage: '256GB', desc: 'Affordable flagship with Snapdragon 8 Gen 3.' },
    { model: 'Edge 50 Ultra', brand: motorolaBrand, price: 59900, ram: 12, storage: '512GB', desc: 'Pantone-validated display and wooden back design.' },
    { model: 'Nothing Phone (2)', brand: googleBrand, price: 44900, ram: 12, storage: '256GB', desc: 'Unique glyph interface design with Snapdragon 8+ Gen 1.' },
  ]

  const cameraTemplates = [
    { model: 'Alpha 7 IV', brand: sonyBrand, price: 219900, megapixels: 33, sensor: 'Full-Frame CMOS', desc: 'Sony hybrid mirrorless camera with advanced autofocus.' },
    { model: 'EOS R5', brand: canonBrand, price: 329900, megapixels: 45, sensor: 'Full-Frame CMOS', desc: 'Canon flagship mirrorless with 8K video capability.' },
    { model: 'Z6 II', brand: nikonBrand, price: 139900, megapixels: 24, sensor: 'Full-Frame BSI CMOS', desc: 'Versatile Nikon mirrorless with dual processors.' },
    { model: 'X-T5', brand: fujifilmBrand, price: 169900, megapixels: 40, sensor: 'APS-C X-Trans CMOS', desc: 'Retro-style photography-focused camera from Fujifilm.' },
    { model: 'Lumix GH6', brand: panasonicBrand, price: 179900, megapixels: 25, sensor: 'Micro Four Thirds', desc: 'Video-centric powerhouse mirrorless camera.' },
    { model: 'Cyber-shot RX100 VII', brand: sonyBrand, price: 94900, megapixels: 20, sensor: '1-inch Exmor RS CMOS', desc: 'Premium pocket-sized compact camera.' },
    { model: 'PowerShot G7 X Mark III', brand: canonBrand, price: 64900, megapixels: 20, sensor: '1-inch Stacked CMOS', desc: 'Popular vlogging compact camera.' },
    { model: 'Leica Q3', brand: leicaBrand, price: 590000, megapixels: 60, sensor: 'Full-Frame BSI CMOS', desc: 'Luxury compact camera with fixed 28mm Summilux lens.' },
    { model: 'OM-1', brand: omSystemBrand, price: 189900, megapixels: 20, sensor: 'Micro Four Thirds Stacked', desc: 'Rugged weather-sealed adventure camera.' },
    { model: 'HERO12 Black', brand: goproBrand, price: 37900, megapixels: 27, sensor: '1/1.9-inch CMOS', desc: 'The ultimate action camera with HyperSmooth stabilization.' },
  ]

  payload.logger.info(`— Seeding master templates...`)
  const masterProducts: any[] = []
  let productSmartphone: any = null

  // 1. Seed Mobile Master Templates
  for (const m of mobileTemplates) {
    const isFirstSmartphone = !productSmartphone && m.brand.id === appleBrand.id
    const slug = m.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    const createdProduct = await payload.create({
      collection: 'products',
      depth: 0,
      data: {
        title: m.model,
        slug,
        _status: 'published',
        brand: m.brand.id,
        categories: [mobileCategory.id],
        priceInINREnabled: true,
        priceInINR: m.price * 100, // Paise
        inventory: 100,
        discountPercent: 10,
        isMasterTemplate: true,
        parentTemplate: null,
        description: createLexicalDescription(m.desc),
        specifications: [
          { key: 'RAM', value: String(m.ram), type: 'number' },
          { key: 'Storage', value: m.storage, type: 'select' },
        ],
        gallery: [{ image: imageTshirtBlack.id }],
        meta: {
          title: `${m.model} | ZiniKart`,
          description: m.desc,
          image: imageTshirtBlack.id,
        },
      },
    })
    
    let finalProduct = createdProduct
    if (isFirstSmartphone) {
      productSmartphone = createdProduct
      finalProduct = await payload.update({
        collection: 'products',
        id: createdProduct.id,
        data: {
          enableVariants: true,
          variantTypes: [colorType.id, storageType.id],
          gallery: [
            { image: imageTshirtBlack.id, variantOption: optBlack.id },
            { image: imageTshirtWhite.id, variantOption: optWhite.id },
          ],
        },
      })
    }
    masterProducts.push(finalProduct)
  }

  // 2. Seed Camera Master Templates
  let productCamera: any = null
  for (const c of cameraTemplates) {
    const slug = c.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const createdProduct = await payload.create({
      collection: 'products',
      depth: 0,
      data: {
        title: c.model,
        slug,
        _status: 'published',
        brand: c.brand.id,
        categories: [cameraCategory.id],
        priceInINREnabled: true,
        priceInINR: c.price * 100, // Paise
        inventory: 100,
        discountPercent: 12,
        isMasterTemplate: true,
        parentTemplate: null,
        description: createLexicalDescription(c.desc),
        specifications: [
          { key: 'Megapixels', value: String(c.megapixels), type: 'number' },
          { key: 'Sensor Type', value: c.sensor, type: 'text' },
        ],
        gallery: [{ image: imageHat.id }],
        meta: {
          title: `${c.model} | ZiniKart`,
          description: c.desc,
          image: imageHat.id,
        },
      },
    })
    
    let finalProduct = createdProduct
    if (!productCamera) {
      productCamera = createdProduct
      finalProduct = await payload.update({
        collection: 'products',
        id: createdProduct.id,
        data: {
          enableVariants: true,
          variantTypes: [kitType.id],
        },
      })
    }
    masterProducts.push(finalProduct)
  }

  let hoodieID: number | string = productSmartphone.id

  if (payload.db.defaultIDType === 'text') {
    hoodieID = `"${hoodieID}"`
  }

  // Seeding 3 variants for each product
  // 1. Smartphone Variants
  const [
    smartphoneVar1,
    smartphoneVar2,
    smartphoneVar3,
  ] = await Promise.all([
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productSmartphone,
        variantOptions: [optBlack, opt128GB],
        inventory: 10,
        priceInINR: 9990000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productSmartphone,
        variantOptions: [optWhite, opt256GB],
        inventory: 15,
        priceInINR: 10990000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productSmartphone,
        variantOptions: [optGold, opt512GB],
        inventory: 5,
        priceInINR: 12490000,
      }),
    }),
  ])

  // 2. Headphones Variants
  const [
    headphonesVar1,
    headphonesVar2,
    headphonesVar3,
  ] = await Promise.all([
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productHeadphones,
        variantOptions: [optBlack],
        inventory: 20,
        priceInINR: 1490000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productHeadphones,
        variantOptions: [optSilver],
        inventory: 25,
        priceInINR: 1490000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productHeadphones,
        variantOptions: [optBlue],
        inventory: 15,
        priceInINR: 1690000,
      }),
    }),
  ])

  // 3. Camera Variants
  const [
    cameraVar1,
    cameraVar2,
    cameraVar3,
  ] = await Promise.all([
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productCamera,
        variantOptions: [optBodyOnly],
        inventory: 8,
        priceInINR: 11990000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productCamera,
        variantOptions: [optLensKit2870],
        inventory: 12,
        priceInINR: 13990000,
      }),
    }),
    payload.create({
      collection: 'variants',
      depth: 0,
      data: productSmartphoneVariant({
        product: productCamera,
        variantOptions: [optLensKit50],
        inventory: 5,
        priceInINR: 14990000,
      }),
    }),
  ])

  payload.logger.info(`— Seeding retailer and delivery partner profiles...`)

  const retailerDetails = [
    { email: 'retailer@example.com', name: 'ZiniTech Shop Owner', shopName: 'ZiniTech Shop', mobile: '+919999999990', owner: 'Madhav G' },
    { email: 'retailer2@example.com', name: 'Madhav Digitronics Owner', shopName: 'Madhav Digitronics', mobile: '+919999999991', owner: 'Rohan B' },
    { email: 'retailer3@example.com', name: 'Global Camera Hub Owner', shopName: 'Global Camera Hub', mobile: '+919999999992', owner: 'Amit K' },
    { email: 'retailer4@example.com', name: 'Alpha Mobile Store Owner', shopName: 'Alpha Mobile Store', mobile: '+919999999993', owner: 'Preet S' },
  ]

  const seededRetailers: any[] = []

  for (let idx = 0; idx < retailerDetails.length; idx++) {
    const r = retailerDetails[idx]
    
    // Check/Delete user if exists
    await payload.delete({
      collection: 'users',
      depth: 0,
      where: {
        email: { equals: r.email }
      }
    })

    const userDoc = await payload.create({
      collection: 'users',
      data: {
        name: r.name,
        email: r.email,
        password: 'password',
        roles: ['retailer'],
        mobileNumber: r.mobile,
        mobileVerified: true,
      },
    })

    const profile = await payload.create({
      collection: 'retailers',
      data: {
        shopName: r.shopName,
        ownerName: r.owner,
        mobileNumber: r.mobile,
        emailId: r.email,
        gstNumber: `07AAAAA1111A${idx}Z${idx}`,
        images: [imageHat.id],
        shopAddress: {
          street: `12${idx} Retailer Lane`,
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110001',
          lat: 28.6139,
          lng: 77.2090,
        },
        bankDetails: {
          accountHolderName: r.owner,
          accountNumber: `123456789${idx}`,
          ifscCode: 'UTIB0000001',
          bankName: 'Axis Bank',
        },
        businessHours: {
          startTime: '09:00',
          endTime: '21:00',
          openEveryday: true,
        },
        approvalStatus: 'approved',
        user: userDoc.id,
      },
    })

    seededRetailers.push({
      user: userDoc,
      profile,
    })
  }

  // Seed retailer cloned products (80 total)
  payload.logger.info(`— Seeding 80 retailer cloned products (20 master templates * 4 retailers)...`)
  let clonedCount = 0
  for (const r of seededRetailers) {
    for (const template of masterProducts) {
      const brandId = typeof template.brand === 'object' ? template.brand.id : template.brand
      const categoryIds = Array.isArray(template.categories)
        ? template.categories.map((c: any) => typeof c === 'object' ? c.id : c)
        : []

      const cleanSpecs = Array.isArray(template.specifications)
        ? template.specifications.map((s: any) => ({ key: s.key, value: s.value, type: s.type }))
        : []

      const cleanGallery = Array.isArray(template.gallery)
        ? template.gallery.map((g: any) => ({
            image: typeof g.image === 'object' ? g.image.id : g.image,
            variantOption: typeof g.variantOption === 'object' ? g.variantOption?.id : g.variantOption,
          }))
        : []

      const metaImageId = typeof template.meta?.image === 'object'
        ? template.meta.image.id
        : template.meta?.image || imageTshirtBlack.id

      // Calculate distinct pricing multiplier per retailer (90% to 105%)
      const multiplier = 0.90 + (seededRetailers.indexOf(r) * 0.05)
      const price = Math.round(template.priceInINR * multiplier)

      // Query template variants (if template.enableVariants is true)
      let templateVariants: any[] = []
      if (template.enableVariants) {
        const variantDocs = await payload.find({
          collection: 'variants',
          where: {
            product: { equals: template.id },
          },
          depth: 0,
        })
        templateVariants = variantDocs.docs
      }

      const clonedProduct = await payload.create({
        collection: 'products',
        data: {
          title: `${template.title} (${r.profile.shopName})`,
          slug: `${template.slug}-${r.profile.id}`,
          _status: 'published',
          enableVariants: template.enableVariants || false,
          variantTypes: Array.isArray(template.variantTypes)
            ? template.variantTypes.map((vt: any) => typeof vt === 'object' ? vt.id : vt)
            : [],
          categories: categoryIds,
          brand: brandId,
          priceInINREnabled: true,
          priceInINR: price,
          discountPercent: 10, // 10% discount on cloned products
          inventory: template.enableVariants ? null : 30, // Direct stock if variants not enabled
          warranty: '1 Year Brand Warranty',
          isMasterTemplate: false,
          parentTemplate: template.id,
          retailer: r.user.id, // linked to retailer user ID
          specifications: cleanSpecs,
          gallery: cleanGallery,
          meta: {
            title: `${template.title} | ${r.profile.shopName}`,
            description: `Buy ${template.title} at custom prices from ${r.profile.shopName}.`,
            image: metaImageId,
          },
        },
      })

      // Clone variants if template had them
      if (template.enableVariants && templateVariants.length > 0) {
        for (const tv of templateVariants) {
          const varPrice = Math.round(tv.priceInINR * multiplier)
          await payload.create({
            collection: 'variants',
            data: {
              product: clonedProduct.id,
              options: tv.options.map((o: any) => typeof o === 'object' ? o.id : o),
              inventory: 15, // realistic stock for retailer variant
              priceInINREnabled: true,
              priceInINR: varPrice,
              _status: 'published',
            },
          })
        }
      }

      clonedCount++
    }
  }
  payload.logger.info(`— Successfully seeded ${clonedCount} cloned products.`)

  // Predefined custom products data
  const customMobiles = [
    { title: 'iPhone XR (Refurbished)', brand: appleBrand, price: 18500, ram: 3, storage: '64GB', desc: 'Fully functional refurbished iPhone XR.' },
    { title: 'OnePlus Nord CE 3 Lite (Open Box)', brand: oneplusBrand, price: 15500, ram: 8, storage: '128GB', desc: 'Open box OnePlus Nord with full warranty.' },
    { title: 'Galaxy M34 5G (Pre-Owned)', brand: samsungBrand, price: 12000, ram: 6, storage: '128GB', desc: 'Gently used Galaxy M34 in good condition.' },
    { title: 'Redmi Note 12 Pro (Refurbished)', brand: xiaomiBrand, price: 16500, ram: 8, storage: '128GB', desc: 'Superb quality refurbished Redmi Note.' },
    { title: 'Nothing Phone (1) (Used)', brand: googleBrand, price: 21000, ram: 8, storage: '256GB', desc: 'Used Nothing Phone (1) with minor scratches.' },
    { title: 'Pixel 6a (Certified Pre-Owned)', brand: googleBrand, price: 22000, ram: 6, storage: '128GB', desc: 'Google certified pre-owned Pixel.' },
    { title: 'Moto G54 5G (Open Box)', brand: motorolaBrand, price: 11000, ram: 8, storage: '128GB', desc: 'Mint condition open box Motorola phone.' },
    { title: 'Oppo A78 (Refurbished)', brand: oppoBrand, price: 12500, ram: 8, storage: '128GB', desc: 'Refurbished Oppo phone with charger.' },
    { title: 'Realme Narzo 60 (Used)', brand: realmeBrand, price: 13000, ram: 8, storage: '128GB', desc: 'Used Realme Narzo in black color.' },
    { title: 'iPhone 12 Mini (Refurbished)', brand: appleBrand, price: 28000, ram: 4, storage: '64GB', desc: 'Compact refurbished iPhone 12 Mini.' },
  ]

  const customCameras = [
    { title: 'Vintage Yashica Electro 35', brand: sonyBrand, price: 8500, megapixels: 1, sensor: 'Rangefinder Film', desc: 'Classic vintage film camera for collectors.' },
    { title: 'Polaroid OneStep+ (Instant)', brand: leicaBrand, price: 11500, megapixels: 1, sensor: 'Instant Film', desc: 'Bluetooth-connected analog instant camera.' },
    { title: 'Fujifilm Instax Mini 12', brand: fujifilmBrand, price: 6500, megapixels: 1, sensor: 'Instant Film', desc: 'Brand new Fujifilm instax camera.' },
    { title: 'Canon AE-1 Film Camera (Vintage)', brand: canonBrand, price: 12500, megapixels: 1, sensor: '35mm SLR Film', desc: 'Legendary vintage SLR film camera.' },
    { title: 'Kodak Pixpro FZ45 Compact', brand: canonBrand, price: 8900, megapixels: 16, sensor: '1/2.3-inch CMOS', desc: 'Pocket compact digital camera.' },
    { title: 'Nikon D3500 DSLR (Used)', brand: nikonBrand, price: 24000, megapixels: 24, sensor: 'APS-C CMOS', desc: 'Excellent beginner DSLR with kit lens.' },
    { title: 'Sony Cyber-shot H300 (Used)', brand: sonyBrand, price: 12000, megapixels: 20, sensor: '1/2.3-inch CCD', desc: 'Bridge camera with 35x optical zoom.' },
    { title: 'Polaroid Now Gen 2', brand: leicaBrand, price: 9500, megapixels: 1, sensor: 'Instant Film', desc: 'New generation analog instant camera.' },
    { title: 'Lomography LomoApparat', brand: leicaBrand, price: 7900, megapixels: 1, sensor: '35mm Film', desc: 'Wide-angle analog camera for creative effects.' },
    { title: 'Fujifilm Instax Wide 300', brand: fujifilmBrand, price: 10500, megapixels: 1, sensor: 'Instant Film', desc: 'Wide format instant camera.' },
  ]

  payload.logger.info(`— Seeding 20 custom unique retailer products (no parent template)...`)
  let customCount = 0
  
  // Seed Mobiles (10)
  for (let i = 0; i < customMobiles.length; i++) {
    const m = customMobiles[i]
    const retailerIndex = i % seededRetailers.length
    const r = seededRetailers[retailerIndex]
    const slug = m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-custom-${r.profile.id}`

    await payload.create({
      collection: 'products',
      data: {
        title: m.title,
        slug,
        _status: 'published',
        enableVariants: false,
        categories: [mobileCategory.id],
        brand: m.brand.id,
        priceInINREnabled: true,
        priceInINR: m.price * 100, // Paise
        inventory: 20,
        discountPercent: 15,
        warranty: '6 Months Seller Warranty',
        isMasterTemplate: false,
        parentTemplate: null, // No parent template!
        retailer: r.user.id,
        specifications: [
          { key: 'RAM', value: String(m.ram), type: 'number' },
          { key: 'Storage', value: m.storage, type: 'select' },
        ],
        gallery: [{ image: imageTshirtBlack.id }],
        meta: {
          title: `${m.title} | ${r.profile.shopName}`,
          description: m.desc,
          image: imageTshirtBlack.id,
        },
      },
    })
    customCount++
  }

  // Seed Cameras (10)
  for (let i = 0; i < customCameras.length; i++) {
    const c = customCameras[i]
    const r = seededRetailers[2] // Retailer 3 (Global Camera Hub)
    const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-custom-${r.profile.id}`

    await payload.create({
      collection: 'products',
      data: {
        title: c.title,
        slug,
        _status: 'published',
        enableVariants: false,
        categories: [cameraCategory.id],
        brand: c.brand.id,
        priceInINREnabled: true,
        priceInINR: c.price * 100, // Paise
        inventory: 15,
        discountPercent: 20,
        warranty: '6 Months Seller Warranty',
        isMasterTemplate: false,
        parentTemplate: null, // No parent template!
        retailer: r.user.id,
        specifications: [
          { key: 'Megapixels', value: String(c.megapixels), type: 'number' },
          { key: 'Sensor Type', value: c.sensor, type: 'text' },
        ],
        gallery: [{ image: imageHat.id }],
        meta: {
          title: `${c.title} | ${r.profile.shopName}`,
          description: c.desc,
          image: imageHat.id,
        },
      },
    })
    customCount++
  }
  payload.logger.info(`— Successfully seeded ${customCount} custom unique products.`)

  const deliveryProfile = await payload.create({
    collection: 'delivery-partners',
    data: {
      fullName: 'Rider Ramesh',
      mobileNumber: '+918888888880',
      email: 'delivery@example.com',
      gender: 'male',
      dob: '1995-05-15',
      drivingLicense: imageHat.id,
      drivingLicenseNumber: 'DL-1234567890',
      pancardNumber: 'ABCDE1234F',
      pancardImage: imageHat.id,
      vehicleBrand: 'Hero Splendor',
      vehicleRegistrationNumber: 'MH-01-AB-1234',
      selfieImage: imageHat.id,
      bankDetails: {
        accountHolderName: 'Rider Ramesh',
        accountNumber: '987654321012',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        upiId: 'ramesh@okhdfc',
      },
      vehicleType: 'bike',
      approvalStatus: 'approved',
      onlineStatus: true,
      user: deliveryPartnerUser.id,
    },
  })

  payload.logger.info(`— Seeding contact form...`)

  const contactForm = await payload.create({
    collection: 'forms',
    depth: 0,
    data: contactFormData(),
  })

  payload.logger.info(`— Seeding pages...`)

  const [_, contactPage] = await Promise.all([
    payload.create({
      collection: 'pages',
      depth: 0,
      context: {
        disableRevalidate: true,
      },
      data: homePageData({
        contentImage: imageHero,
        metaImage: imageHat,
      }),
    }),
    payload.create({
      collection: 'pages',
      depth: 0,
      context: {
        disableRevalidate: true,
      },
      data: contactPageData({
        contactForm: contactForm,
      }),
    }),
  ])

  payload.logger.info(`— Seeding addresses...`)

  const customerUSAddress = await payload.create({
    collection: 'addresses',
    depth: 0,
    data: {
      customer: customer.id,
      ...(baseAddressUSData as Address),
    },
  })

  const customerUKAddress = await payload.create({
    collection: 'addresses',
    depth: 0,
    data: {
      customer: customer.id,
      ...(baseAddressUKData as Address),
    },
  })

  payload.logger.info(`— Seeding globals...`)

  await Promise.all([
    payload.updateGlobal({
      slug: 'header',
      context: {
        disableRevalidate: true,
      },
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'Home',
              url: '/',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Shop',
              url: '/shop',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Account',
              url: '/account',
            },
          },
        ],
      },
    }),
    payload.updateGlobal({
      slug: 'footer',
      context: {
        disableRevalidate: true,
      },
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'Admin',
              url: '/admin',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Find my order',
              url: '/find-order',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Source Code',
              newTab: true,
              url: 'https://github.com/payloadcms/payload/tree/3.x/templates/website',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Payload',
              newTab: true,
              url: 'https://payloadcms.com/',
            },
          },
        ],
      },
    }),
  ])

  payload.logger.info('Seeded database successfully!')
}

async function fetchFileByURL(url: string): Promise<File> {
  const res = await fetch(url, {
    credentials: 'include',
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()

  return {
    name: url.split('/').pop() || `file-${Date.now()}`,
    data: Buffer.from(data),
    mimetype: `image/${url.split('.').pop()}`,
    size: data.byteLength,
  }
}

async function fetchImageWithFallback(
  payload: Payload,
  url: string | null | undefined,
  fallbackImageId: string | number
): Promise<string | number> {
  if (!url) return fallbackImageId
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const filename = url.split('/').pop() || `phone-${Date.now()}.webp`
    const file: File = {
      name: filename,
      data: Buffer.from(arrayBuffer),
      mimetype: `image/${filename.split('.').pop() || 'webp'}`,
      size: arrayBuffer.byteLength,
    }
    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: filename,
      },
      file,
    })
    return mediaDoc.id
  } catch (err) {
    payload.logger.warn(`Failed to fetch image ${url}, falling back.`)
    return fallbackImageId
  }
}

function parseReleaseDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined
  const cleaned = dateStr.replace(/Exp\.|Rumored|Upcoming|Announced/gi, '').trim()
  const parsed = Date.parse(cleaned)
  if (isNaN(parsed)) return undefined
  return new Date(parsed).toISOString().split('T')[0]
}

function createLexicalDescription(text: string): any {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1,
            },
          ],
        },
      ],
    },
  }
}
