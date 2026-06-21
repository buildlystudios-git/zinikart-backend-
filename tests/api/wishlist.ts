import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'

export async function runWishlistTests(
  report: ReportManager,
  payload: Payload,
  customerToken: string,
  retailerToken?: string
) {
  report.setSuite('Wishlist Collection')
  console.log('\nRunning Wishlist Collection tests...')

  // Step 0: Ensure we have tokens
  if (!customerToken) {
    report.assert('Wishlist tests setup failed: missing customerToken', false, 'Best Case')
    return
  }

  // Find a cloned/retailer product to add
  const clonedProducts = await payload.find({
    collection: 'products',
    where: {
      isMasterTemplate: { equals: false },
    },
    limit: 1,
    overrideAccess: true,
  })
  const clonedProduct = clonedProducts.docs[0]

  // Find a master template product to test validation rejection
  const masterProducts = await payload.find({
    collection: 'products',
    where: {
      isMasterTemplate: { equals: true },
    },
    limit: 1,
    overrideAccess: true,
  })
  const masterProduct = masterProducts.docs[0]

  if (!clonedProduct || !masterProduct) {
    report.assert('Wishlist tests setup failed: missing products in database', false, 'Best Case')
    return
  }

  // 1. Attempt to view wishlist without authentication
  const unauthGetRes = await apiRequest('/api/wishlists', 'GET')
  report.assert(
    'Attempt to read Wishlist without authentication returns 401 or 403 error',
    unauthGetRes.status === 401 || unauthGetRes.status === 403,
    'Impossible Scenario',
    `Expected 401 or 403, got ${unauthGetRes.status}`
  )

  // 2. Attempt to add a product without authentication
  const unauthPostRes = await apiRequest('/api/wishlists', 'POST', {
    product: clonedProduct.id,
  })
  report.assert(
    'Attempt to create Wishlist entry without authentication returns 401 or 403 error',
    unauthPostRes.status === 401 || unauthPostRes.status === 403,
    'Impossible Scenario',
    `Expected 401 or 403, got ${unauthPostRes.status}`
  )

  // 3. Attempt to add a master template product (should be rejected with 400 ValidationError)
  const addMasterRes = await apiRequest(
    '/api/wishlists',
    'POST',
    {
      product: masterProduct.id,
    },
    customerToken
  )
  report.assert(
    'Attempt to add a master catalog template to wishlist returns 400 validation error',
    addMasterRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${addMasterRes.status}. Response: ${JSON.stringify(addMasterRes.body)}`
  )

  // 4. Add a valid retailer product to wishlist
  const addClonedRes = await apiRequest(
    '/api/wishlists',
    'POST',
    {
      product: clonedProduct.id,
    },
    customerToken
  )
  const wishlistItemId = addClonedRes.body?.doc?.id
  const isAdded = addClonedRes.status === 201 && !!wishlistItemId

  report.assert(
    'Customer can successfully add a retail product listing to their wishlist (returns 201)',
    isAdded,
    'Best Case',
    `Expected status 201, got ${addClonedRes.status}. Response: ${JSON.stringify(addClonedRes.body)}`
  )

  if (!isAdded) return

  // 5. Attempt to add the duplicate retailer product (should be rejected with 400 validation error)
  const duplicateRes = await apiRequest(
    '/api/wishlists',
    'POST',
    {
      product: clonedProduct.id,
    },
    customerToken
  )
  report.assert(
    'Attempt to add duplicate product entry to wishlist returns 400 validation error',
    duplicateRes.status === 400,
    'Impossible Scenario',
    `Expected status 400, got ${duplicateRes.status}. Response: ${JSON.stringify(duplicateRes.body)}`
  )

  // 6. Query own wishlist (should return the item)
  const getWishlistRes = await apiRequest('/api/wishlists', 'GET', null, customerToken)
  const hasItem = Array.isArray(getWishlistRes.body?.docs) &&
    getWishlistRes.body.docs.some((doc: any) => doc.id === wishlistItemId)
  report.assert(
    'Customer can retrieve their own wishlist entries successfully',
    getWishlistRes.status === 200 && hasItem,
    'Best Case',
    `Expected status 200 and docs containing ${wishlistItemId}, got status: ${getWishlistRes.status}, body: ${JSON.stringify(getWishlistRes.body)}`
  )

  // 7. Access control validation: Another customer/retailer user cannot read this entry
  if (retailerToken) {
    const intruderGetRes = await apiRequest(`/api/wishlists/${wishlistItemId}`, 'GET', null, retailerToken)
    report.assert(
      'Unauthorized user is blocked from reading another customer\'s wishlist entry (returns 403 or 404)',
      intruderGetRes.status === 403 || intruderGetRes.status === 404,
      'Worst Case',
      `Expected status 403 or 404, got ${intruderGetRes.status}`
    )

    const intruderDeleteRes = await apiRequest(`/api/wishlists/${wishlistItemId}`, 'DELETE', null, retailerToken)
    report.assert(
      'Unauthorized user is blocked from deleting another customer\'s wishlist entry (returns 403 or 404)',
      intruderDeleteRes.status === 403 || intruderDeleteRes.status === 404,
      'Worst Case',
      `Expected status 403 or 404, got ${intruderDeleteRes.status}`
    )
  }

  // 8. Delete the item from wishlist
  const deleteRes = await apiRequest(`/api/wishlists/${wishlistItemId}`, 'DELETE', null, customerToken)
  report.assert(
    'Customer can delete their own wishlist entry (returns 200 or 204)',
    deleteRes.status === 200 || deleteRes.status === 204,
    'Best Case',
    `Expected status 200 or 204, got ${deleteRes.status}`
  )

  // 9. Verify wishlist is empty
  const finalGetRes = await apiRequest('/api/wishlists', 'GET', null, customerToken)
  const isEmpty = Array.isArray(finalGetRes.body?.docs) && finalGetRes.body.docs.length === 0
  report.assert(
    'Wishlist is empty after successful item deletion',
    finalGetRes.status === 200 && isEmpty,
    'Best Case',
    `Expected status 200 and empty docs list, got status: ${finalGetRes.status}, body: ${JSON.stringify(finalGetRes.body)}`
  )
}
