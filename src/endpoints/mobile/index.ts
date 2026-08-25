import type { Endpoint } from 'payload'
import { productDetailsEndpoint } from './catalog/productDetails'
import { productListEndpoint } from './catalog/productList'
import { reorderListEndpoint } from './catalog/reorderList'
import { wishlistEndpoint } from './catalog/wishlist'
import { searchEndpoint } from './search'
import { categoryListEndpoint } from './categories/categoryList'
import { brandListEndpoint } from './brands/brandList'
import { homeEndpoint } from './home/homeEndpoint'

export const mobileEndpoints: Endpoint[] = [
  {
    path: '/mobile/products',
    method: 'get',
    handler: productListEndpoint,
  },
  {
    path: '/mobile/products/reorder',
    method: 'get',
    handler: reorderListEndpoint,
  },
  {
    path: '/mobile/products/wishlist',
    method: 'get',
    handler: wishlistEndpoint,
  },
  {
    path: '/mobile/products/:id',
    method: 'get',
    handler: productDetailsEndpoint,
  },
  {
    path: '/mobile/search',
    method: 'get',
    handler: searchEndpoint,
  },
  {
    path: '/mobile/categories',
    method: 'get',
    handler: categoryListEndpoint,
  },
  {
    path: '/mobile/brands',
    method: 'get',
    handler: brandListEndpoint,
  },
  {
    path: '/mobile/home',
    method: 'get',
    handler: homeEndpoint,
  },
]
