import type { Category, Media, Product, VariantType } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type ProductArgs = {
  galleryImages: NonNullable<Product['gallery']>
  metaImage: Media
  variantTypes: VariantType[]
  categories: Category[]
  relatedProducts: Product[]
}

export const productSmartphoneData = ({
  galleryImages,
  variantTypes,
  categories,
  metaImage,
  relatedProducts,
}: ProductArgs): RequiredDataFromCollectionSlug<'products'> => {
  return {
    title: 'ZiniPhone 14 Max',
    slug: 'ziniphone-14-max',
    _status: 'published',
    enableVariants: true,
    variantTypes,
    categories,
    priceInINREnabled: true,
    priceInINR: 99900,
    gallery: galleryImages,
    meta: {
      title: 'ZiniPhone 14 Max | ZiniKart',
      description: 'The ultimate smartphone experience.',
      image: metaImage,
    },
    specifications: [
      { key: 'RAM', value: '8', type: 'number' },
      { key: 'Storage', value: '128GB', type: 'select' },
      { key: 'Release Date', value: '2026-06-18', type: 'date' },
    ],
    relatedProducts,
  }
}

export const productSmartphoneVariant = ({
  product,
  variantOptions,
  inventory = 10,
  priceInINR = 99900,
}: {
  product: Product
  variantOptions: any[]
  inventory?: number
  priceInINR?: number
}): RequiredDataFromCollectionSlug<'variants'> => {
  return {
    product: product,
    options: variantOptions,
    inventory,
    priceInINREnabled: true,
    priceInINR,
    _status: 'published',
  }
}
