import type { Category, Media, Product, VariantType } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type ProductArgs = {
  galleryImage: Media
  categories: Category[]
  variantTypes: VariantType[]
  relatedProducts: Product[]
}

export const productCameraData = ({
  galleryImage,
  categories,
  variantTypes,
  relatedProducts,
}: ProductArgs): RequiredDataFromCollectionSlug<'products'> => {
  return {
    title: 'ZiniShot Alpha',
    slug: 'zinishot-alpha',
    _status: 'published',
    enableVariants: true,
    variantTypes,
    categories,
    priceInINREnabled: true,
    priceInINR: 119900,
    gallery: [{ image: galleryImage }],
    meta: {
      title: 'ZiniShot Alpha | ZiniKart',
      description: 'Professional Mirrorless Camera.',
      image: galleryImage,
    },
    specifications: [
      { key: 'Megapixels', value: '24', type: 'number' },
      { key: 'Sensor Type', value: 'Full Frame', type: 'text' },
    ],
    relatedProducts,
  }
}
