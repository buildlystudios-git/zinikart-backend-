import type { Category, Media, Product, VariantType } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type ProductArgs = {
  galleryImage: Media
  metaImage: Media
  categories: Category[]
  variantTypes: VariantType[]
  relatedProducts: Product[]
}

export const productHeadphonesData = ({
  galleryImage,
  metaImage,
  categories,
  variantTypes,
  relatedProducts,
}: ProductArgs): RequiredDataFromCollectionSlug<'products'> => {
  return {
    title: 'ZiniBuds Pro',
    slug: 'zinibuds-pro',
    _status: 'published',
    enableVariants: true,
    variantTypes,
    categories,
    priceInINREnabled: true,
    priceInINR: 14900,
    gallery: [{ image: galleryImage }],
    meta: {
      title: 'ZiniBuds Pro | ZiniKart',
      description: 'Noise Cancelling Wireless Headphones.',
      image: metaImage,
    },
    specifications: [
      { key: 'Connectivity', value: 'Wireless', type: 'select' },
      { key: 'Noise Cancellation', value: 'Active Noise Cancellation', type: 'text' },
    ],
    relatedProducts,
  }
}
