import type { Endpoint } from 'payload'
import { productDetailsEndpoint } from './catalog/productDetails'
import { productListEndpoint } from './catalog/productList'
import { searchEndpoint } from './search'
import { categoryListEndpoint } from './categories/categoryList'
import { brandListEndpoint } from './brands/brandList'

export const mobileEndpoints: Endpoint[] = [
  {
    path: '/mobile/products',
    method: 'get',
    handler: productListEndpoint,
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
]
