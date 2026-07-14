import type { Payload } from 'payload'

export async function seedBrands(payload: Payload, uniqueBrands: Set<string>): Promise<Record<string, any>> {
  payload.logger.info(`— Seeding brands...`)

  // Pre-seed static camera/headphones brands to ensure they exist
  const staticBrands = [
    'Apple', 'Samsung', 'Sony', 'Oppo', 'Vivo', 'Realme', 'Motorola', 'OnePlus', 'Google',
    'Xiaomi', 'Fujifilm', 'Panasonic', 'Leica', 'GoPro', 'OM System', 'Canon', 'Nikon'
  ]
  staticBrands.forEach(b => uniqueBrands.add(b))

  const brandDocMap: Record<string, any> = {}

  for (const brandName of uniqueBrands) {
    const key = brandName.toLowerCase()
    if (!brandDocMap[key]) {
      const slug = key.replace(/[^a-z0-9]+/g, '-')
      const existing = await payload.find({
        collection: 'brands',
        where: { slug: { equals: slug } },
      })
      if (existing.docs.length > 0) {
        brandDocMap[key] = existing.docs[0]
      } else {
        try {
          const newBrand = await payload.create({
            collection: 'brands',
            data: {
              name: brandName,
              slug: slug,
              description: `${brandName} official brand.`,
              featured: staticBrands.includes(brandName) ? true : false,
            }
          })
          brandDocMap[key] = newBrand
        } catch (err) {
          payload.logger.error(`Failed to create brand ${brandName}`)
        }
      }
    }
  }

  return brandDocMap
}
