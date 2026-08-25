import type { Payload } from 'payload'

async function createCategorySafe(payload: Payload, data: any) {
  try {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: data.slug } },
    })
    if (existing.docs.length > 0) {
      return existing.docs[0]
    }
    return await payload.create({ collection: 'categories', data })
  } catch (err) {
    payload.logger.error(`Failed to create category ${data.slug}`)
  }
}

export async function seedCategories(payload: Payload, uniqueStorageOptions: Set<string>) {
  payload.logger.info(`— Seeding categories...`)
  return Promise.all([
    createCategorySafe(payload, {
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
        { name: 'Display', type: 'text', required: false },
        { name: 'Screen Size', type: 'text', required: false },
        { name: 'Resolution', type: 'text', required: false },
        { name: 'Battery', type: 'text', required: false },
        { name: 'OS', type: 'text', required: false },
        { name: 'Processor', type: 'text', required: false },
        { name: 'Camera', type: 'text', required: false },
      ],
    }),
    createCategorySafe(payload, {
      title: 'Camera',
      slug: 'camera',
      specificationTemplates: [
        { name: 'Megapixels', type: 'number', required: true },
        { name: 'Sensor Size', type: 'text', required: true },
        { name: 'Lens Mount', type: 'text', required: false },
        { name: 'Release Date', type: 'date', required: false },
      ],
    }),
    createCategorySafe(payload, {
      title: 'Headphones',
      slug: 'headphones',
      specificationTemplates: [
        {
          name: 'Connectivity',
          type: 'select',
          options: [{ option: 'Wireless' }, { option: 'Wired' }, { option: 'True Wireless' }],
          required: true,
        },
        { name: 'Noise Cancellation', type: 'text', required: true },
        { name: 'Release Date', type: 'date', required: false },
      ],
    }),
  ])
}
