import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'

export async function runCatalogTests(
  report: ReportManager,
  payload: Payload,
  adminToken: string,
  customerToken: string
) {
  report.setSuite('Catalog Foundation')
  console.log('\nRunning Catalog Foundation tests...')

  // Step 0: Ensure we have tokens
  if (!adminToken) {
    report.assert('Catalog tests setup failed: missing adminToken', false, 'Best Case')
    return
  }

  // --- SECURITY / BOUNDARY SCENARIOS (IMPOSSIBLE SCENARIOS) ---

  // 1. Attempt to create a brand without authentication
  const unauthBrandRes = await apiRequest('/api/brands', 'POST', {
    name: 'Unauthorized Brand',
  })
  report.assert(
    'Attempt to create Brand without auth token returns 401 or 403 error',
    unauthBrandRes.status === 401 || unauthBrandRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${unauthBrandRes.status}`
  )

  // 2. Attempt to create a brand with customer-only auth
  const customerBrandRes = await apiRequest(
    '/api/brands',
    'POST',
    {
      name: 'Customer Role Brand',
    },
    customerToken
  )
  report.assert(
    'Attempt to create Brand with customer role token returns 401 or 403 error',
    customerBrandRes.status === 401 || customerBrandRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${customerBrandRes.status}`
  )

  // 3. Attempt to create a category without authentication
  const unauthCategoryRes = await apiRequest('/api/categories', 'POST', {
    title: 'Unauthorized Category',
  })
  report.assert(
    'Attempt to create Category without auth token returns 401 or 403 error',
    unauthCategoryRes.status === 401 || unauthCategoryRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${unauthCategoryRes.status}`
  )

  // 4. Attempt to create a product without authentication
  const unauthProductRes = await apiRequest('/api/products', 'POST', {
    title: 'Unauthorized Product',
  })
  report.assert(
    'Attempt to create Product without auth token returns 401 or 403 error',
    unauthProductRes.status === 401 || unauthProductRes.status === 403,
    'Impossible Scenario',
    `Expected status 401 or 403, got ${unauthProductRes.status}`
  )

  // --- BEST CASE SCENARIOS (ADMIN CREATIONS) ---

  // 5. Create Brand with admin auth
  const createBrandRes = await apiRequest(
    '/api/brands',
    'POST',
    {
      name: 'ZiniTech',
      description: 'ZiniKart Official Electronics Brand',
      featured: true,
    },
    adminToken
  )
  const brandId = createBrandRes.body?.doc?.id
  const isBrandCreated = createBrandRes.status === 201 && !!brandId

  report.assert(
    'Create Brand with admin auth returns 201 and Brand ID',
    isBrandCreated,
    'Best Case',
    `Expected status 201, got ${createBrandRes.status}. Response: ${JSON.stringify(createBrandRes.body)}`
  )

  if (!isBrandCreated) return

  // 6. Create Parent Category with admin auth
  const createParentCategoryRes = await apiRequest(
    '/api/categories',
    'POST',
    {
      title: 'Mobiles',
    },
    adminToken
  )
  const parentCategoryId = createParentCategoryRes.body?.doc?.id
  const isParentCategoryCreated = createParentCategoryRes.status === 201 && !!parentCategoryId

  report.assert(
    'Create Parent Category with admin auth returns 201 and Category ID',
    isParentCategoryCreated,
    'Best Case',
    `Expected status 201, got ${createParentCategoryRes.status}`
  )

  if (!isParentCategoryCreated) return

  // 7. Create Subcategory with admin auth (linking to Parent Category)
  const createSubcategoryRes = await apiRequest(
    '/api/categories',
    'POST',
    {
      title: 'Smartphones',
      parentCategory: parentCategoryId,
      specificationTemplates: [
        { name: 'RAM', type: 'number', required: true },
        { name: 'Color', type: 'select', required: false, options: [{ option: 'Black' }, { option: 'White' }] },
        { name: 'Release Date', type: 'date', required: false }
      ]
    },
    adminToken
  )
  const subcategoryId = createSubcategoryRes.body?.doc?.id
  const isSubcategoryCreated = createSubcategoryRes.status === 201 && !!subcategoryId

  report.assert(
    'Create Subcategory linked to Parent Category returns 201 and Category ID',
    isSubcategoryCreated,
    'Best Case',
    `Expected status 201, got ${createSubcategoryRes.status}`
  )

  if (!isSubcategoryCreated) return

  // 8. Create Product with specs and brand relation via admin auth
  const createProductRes = await apiRequest(
    '/api/products',
    'POST',
    {
      title: 'ZiniPhone 14 Max',
      _status: 'published',
      categories: [subcategoryId],
      brand: brandId,
      warranty: '2 Year Manufacturer Warranty',
      specifications: [
        { key: 'RAM', value: '12', type: 'number' },
        { key: 'Color', value: 'Black', type: 'select' },
        { key: 'Release Date', value: '2026-05-30', type: 'date' }
      ]
    },
    adminToken
  )
  const productId = createProductRes.body?.doc?.id
  const isProductCreated = createProductRes.status === 201 && !!productId

  report.assert(
    'Create Product with brand and specifications returns 201 and Product ID',
    isProductCreated,
    'Best Case',
    `Expected status 201, got ${createProductRes.status}. Response: ${JSON.stringify(createProductRes.body)}`
  )

  if (!isProductCreated) return

  // --- BOUNDARY VALIDATION SCENARIOS (IMPOSSIBLE/WORST CASE) ---

  // A. Create product missing required specification "RAM"
  const missingSpecRes = await apiRequest(
    '/api/products',
    'POST',
    {
      title: 'Invalid Product (Missing Spec)',
      _status: 'published',
      categories: [subcategoryId],
      brand: brandId,
      warranty: '1 Year',
      specifications: [
        { key: 'Color', value: 'Black', type: 'select' }
      ]
    },
    adminToken
  )
  report.assert(
    'Attempt to create Product missing a required specification returns 400 bad request',
    missingSpecRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${missingSpecRes.status}. Response: ${JSON.stringify(missingSpecRes.body)}`
  )

  // B. Create product with invalid type for numeric specification "RAM"
  const invalidNumberSpecRes = await apiRequest(
    '/api/products',
    'POST',
    {
      title: 'Invalid Product (Invalid Number)',
      _status: 'published',
      categories: [subcategoryId],
      brand: brandId,
      warranty: '1 Year',
      specifications: [
        { key: 'RAM', value: 'twelve', type: 'number' }
      ]
    },
    adminToken
  )
  report.assert(
    'Attempt to create Product with non-numeric value for numeric specification returns 400',
    invalidNumberSpecRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${invalidNumberSpecRes.status}`
  )

  // C. Create product with invalid date for specification "Release Date"
  const invalidDateSpecRes = await apiRequest(
    '/api/products',
    'POST',
    {
      title: 'Invalid Product (Invalid Date)',
      _status: 'published',
      categories: [subcategoryId],
      brand: brandId,
      warranty: '1 Year',
      specifications: [
        { key: 'RAM', value: '12', type: 'number' },
        { key: 'Release Date', value: 'invalid-date', type: 'date' }
      ]
    },
    adminToken
  )
  report.assert(
    'Attempt to create Product with invalid date format returns 400',
    invalidDateSpecRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${invalidDateSpecRes.status}`
  )

  // D. Create product with invalid option for select specification "Color"
  const invalidSelectSpecRes = await apiRequest(
    '/api/products',
    'POST',
    {
      title: 'Invalid Product (Invalid Option)',
      _status: 'published',
      categories: [subcategoryId],
      brand: brandId,
      warranty: '1 Year',
      specifications: [
        { key: 'RAM', value: '12', type: 'number' },
        { key: 'Color', value: 'Red', type: 'select' }
      ]
    },
    adminToken
  )
  report.assert(
    'Attempt to create Product with invalid option for select specification returns 400',
    invalidSelectSpecRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${invalidSelectSpecRes.status}`
  )

  // --- READ & QUERY SCENARIOS ---

  // 9. Query Brands list publicly (without token)
  const queryBrandsRes = await apiRequest('/api/brands', 'GET')
  const foundBrand = queryBrandsRes.body?.docs?.find((d: any) => d.id === brandId)
  report.assert(
    'Public query of Brands list returns 200 and matches created Brand data',
    queryBrandsRes.status === 200 && foundBrand?.name === 'ZiniTech',
    'Best Case',
    `Expected status 200, got ${queryBrandsRes.status}`
  )

  // 10. Query Categories list publicly and verify parent-child relationship
  const queryCategoriesRes = await apiRequest('/api/categories', 'GET')
  const foundSubcat = queryCategoriesRes.body?.docs?.find((d: any) => d.id === subcategoryId)
  const parentIdFromSubcat = typeof foundSubcat?.parentCategory === 'object' 
    ? foundSubcat?.parentCategory?.id 
    : foundSubcat?.parentCategory

  report.assert(
    'Public query of Categories list returns 200 and subcategory correctly links to parent',
    queryCategoriesRes.status === 200 && parentIdFromSubcat === parentCategoryId,
    'Best Case',
    `Expected status 200 and parentCategory match. Subcategory parent: ${parentIdFromSubcat}, Parent: ${parentCategoryId}`
  )

  // 11. Query Product detail publicly and verify brand and specs exist
  const queryProductRes = await apiRequest(`/api/products/${productId}`, 'GET')
  const productDoc = queryProductRes.body
  const brandIdFromProduct = typeof productDoc?.brand === 'object'
    ? productDoc?.brand?.id
    : productDoc?.brand

  const specs = productDoc?.specifications
  const hasSpecs = Array.isArray(specs) && 
    specs.some((s: any) => s.key === 'RAM' && s.value === '12' && s.type === 'number') &&
    specs.some((s: any) => s.key === 'Color' && s.value === 'Black' && s.type === 'select') &&
    specs.some((s: any) => s.key === 'Release Date' && s.value === '2026-05-30' && s.type === 'date')

  report.assert(
    'Public query of Product returns 200, populated brand, warranty, and specifications',
    queryProductRes.status === 200 && brandIdFromProduct === brandId && productDoc?.warranty === '2 Year Manufacturer Warranty' && hasSpecs,
    'Best Case',
    `Expected status 200 and populated fields, got: ${JSON.stringify(productDoc?.specifications)}`
  )
}
