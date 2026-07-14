import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

import { seedUsers } from './seedUsers'
import { seedCategories } from './seedCategories'
import { seedBrands } from './seedBrands'
import { seedProducts } from './seedProducts'
import { seedGlobals } from './seedGlobals'
import { seedPages } from './seedPages'
import { fetchFileByURL } from './utils'
import { SEED_PRODUCT_COUNT } from '@/constants/env'

export const seed = async ({ payload, req }: { payload: Payload; req?: any }): Promise<void> => {
  payload.logger.info('Seeding database...')

  // Clear collections
  const collectionsToClear = ['variants', 'products', 'categories', 'brands', 'pages', 'media'] as const;
  for (const collection of collectionsToClear) {
    try {
      await payload.delete({
        collection,
        where: { id: { exists: true } }
      })
    } catch (e) {
      payload.logger.error(`Failed to clear ${collection}: ${e}`)
    }
  }

  // Parse JSON Dataset
  const jsonPath = path.join(process.cwd(), 'datasets/phones_data_20250729_181901.json')
  const fileContents = fs.readFileSync(jsonPath, 'utf8')
  const productsData = JSON.parse(fileContents)
  
  const seedProductCount = SEED_PRODUCT_COUNT
  const isAll = seedProductCount?.toLowerCase() === 'all'
  const parsedCount = parseInt(seedProductCount as string, 10)
  const selectedProducts = (seedProductCount && !isAll && !isNaN(parsedCount)) 
    ? productsData.slice(0, parsedCount) 
    : productsData

  const uniqueBrands = new Set<string>()
  const uniqueStorageOptions = new Set<string>()
  const uniqueColors = new Set<string>()

  for (const item of selectedProducts) {
    if (item.brand && item.brand !== 'Comparisons') {
      uniqueBrands.add(item.brand.trim())
    }
    const storage = (item.internal_storage || '').trim().replace(/\s+/g, '')
    if (storage) {
      uniqueStorageOptions.add(storage)
    }
    const colorsList = (item.colors || '').split(',').map((c: string) => c.trim()).filter(Boolean)
    colorsList.forEach((c: string) => uniqueColors.add(c))
  }
  
  // Standard fallback options
  uniqueStorageOptions.add('64GB')
  uniqueStorageOptions.add('128GB')
  uniqueStorageOptions.add('256GB')
  uniqueStorageOptions.add('512GB')

  // Fetch Media
  payload.logger.info(`— Fetching media...`)
  const [
    imageHatBuffer,
    imageTshirtBlackBuffer,
    imageTshirtWhiteBuffer,
    heroBuffer,
  ] = await Promise.all([
    fetchFileByURL('https://dummyimage.com/800x600/000/fff.jpg'),
    fetchFileByURL('https://dummyimage.com/800x600/000/eee.jpg'),
    fetchFileByURL('https://dummyimage.com/800x600/000/ddd.jpg'),
    fetchFileByURL('https://dummyimage.com/1200x800/000/ccc.jpg'),
  ])

  const [
    headphonesMediaData,
    smartphoneBlackMediaData,
    smartphoneWhiteMediaData,
    imageHero1Data,
  ] = await Promise.all([
    payload.create({ collection: 'media', data: { alt: 'Headphones' }, file: imageHatBuffer }),
    payload.create({ collection: 'media', data: { alt: 'Black Smartphone' }, file: imageTshirtBlackBuffer }),
    payload.create({ collection: 'media', data: { alt: 'White Smartphone' }, file: imageTshirtWhiteBuffer }),
    payload.create({ collection: 'media', data: { alt: 'Hero Image' }, file: heroBuffer }),
  ])
  
  const imageHatId = headphonesMediaData.id
  const imageTshirtBlackId = smartphoneBlackMediaData.id
  const imageTshirtWhiteId = smartphoneWhiteMediaData.id
  const imageHeroId = imageHero1Data.id

  // Seed Modules
  await seedUsers(payload)
  
  const [mobileCategory, cameraCategory, headphonesCategory] = await seedCategories(payload, uniqueStorageOptions)
  
  const brandDocMap = await seedBrands(payload, uniqueBrands)
  
  await seedProducts(
    payload,
    selectedProducts,
    brandDocMap,
    { mobile: mobileCategory, camera: cameraCategory, headphones: headphonesCategory },
    uniqueStorageOptions,
    uniqueColors,
    { defaultImg: imageTshirtBlackId as string, hatImg: imageHatId as string, whiteImg: imageTshirtWhiteId as string }
  )

  await seedGlobals(payload)
  
  await seedPages(payload, imageHeroId as string, imageHatId as string)

  payload.logger.info('Seeded database successfully!')
}
