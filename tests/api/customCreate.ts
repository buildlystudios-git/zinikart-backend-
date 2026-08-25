import type { Payload } from 'payload'
import { ReportManager, apiRequest } from './helpers'

export async function runCustomCreateTests(report: ReportManager, adminToken: string, retailerToken: string, payload: Payload) {
  report.setSuite('Custom Create Endpoint Tests')


  // Case 8: No auth token (-> 401)
  const noAuthRes = await apiRequest('/api/products/custom-create', 'POST', {
    title: 'Ghost Product',
    priceInINR: 999,
    inventory: 10
  })
  report.assert('Case 8: No auth token returns 401', noAuthRes.status === 401, 'Impossible Scenario', `Status: ${noAuthRes.status}`)

  // Case 7: Missing title on create (-> 400)
  const missingTitleRes = await apiRequest('/api/products/custom-create', 'POST', {
    priceInINR: 999,
    inventory: 10
  }, adminToken)
  report.assert('Case 7: Missing title on create returns 400', missingTitleRes.status === 400, 'Impossible Scenario', `Status: ${missingTitleRes.status}`)

  // Case 1: Create a simple product (no variants)
  const simpleProductTitle = `Premium Wireless Headphones ${Date.now()}`
  const simpleProductRes = await apiRequest('/api/products/custom-create', 'POST', {
    title: simpleProductTitle,
    priceInINR: 4999,
    inventory: 100,
    discountPercent: 10,
    warranty: '1 Year Manufacturer Warranty',
    specifications: [
      { key: 'Battery Life', value: '30 hours', type: 'text' },
      { key: 'Weight', value: '250g', type: 'text' }
    ]
  }, adminToken)
  report.assert('Case 1: Create simple product', simpleProductRes.status === 201, 'Best Case', `Status: ${simpleProductRes.status}`)
  const simpleProductId = simpleProductRes.body?.product?.id

  // Case 2: Create a product with variants
  const variantsProductTitle = `Classic T-Shirt ${Date.now()}`
  const variantsProductRes = await apiRequest('/api/products/custom-create', 'POST', {
    title: variantsProductTitle,
    variants: [
      { attributes: { Color: 'Red', Size: 'Small' }, priceInINR: 799, inventory: 50 },
      { attributes: { Color: 'Red', Size: 'Large' }, priceInINR: 849, inventory: 30 },
      { attributes: { Color: 'Blue', Size: 'Small' }, priceInINR: 799, inventory: 40 }
    ]
  }, adminToken)
  report.assert('Case 2: Create product with variants', variantsProductRes.status === 201, 'Best Case', `Status: ${variantsProductRes.status}, Body: ${JSON.stringify(variantsProductRes.body)}`)
  const variantsProductId = variantsProductRes.body?.product?.id

  // Case 3: Create a product from a parent template (no variants)
  const templateTitle = `Sony WH-1000XM5 Template ${Date.now()}`
  const parentTemplate = await payload.create({
    collection: 'products',
    data: {
      title: templateTitle,
      priceInINR: 30000,
      inventory: 100,
      isTemplate: true
    } as any,
    overrideAccess: true
  })
  const templateProductTitle = `Sony WH-1000XM5 (My Store) ${Date.now()}`
  const templateProductRes = await apiRequest('/api/products/custom-create', 'POST', {
    title: templateProductTitle,
    parentTemplate: parentTemplate.id,
    priceInINR: 29990,
    inventory: 15,
    discountPercent: 5
  }, adminToken)
  report.assert('Case 3: Create product from template', templateProductRes.status === 201, 'Best Case', `Status: ${templateProductRes.status}`)

  // Case 4: Update a product's top-level fields
  if (simpleProductId) {
    const updateSimpleRes = await apiRequest('/api/products/custom-create', 'POST', {
      id: simpleProductId,
      title: `${simpleProductTitle} V2`,
      priceInINR: 5499,
      inventory: 80,
      discountPercent: 15
    }, adminToken)
    report.assert('Case 4: Update top-level fields', updateSimpleRes.status === 201, 'Best Case', `Status: ${updateSimpleRes.status}`)
  } else {
    report.assert('Case 4: Update top-level fields', false, 'Best Case', 'Skipped because simple product creation failed')
  }

  // Case 5: Update a product and upsert all new variants
  let newVariantsProduct
  if (variantsProductId) {
    newVariantsProduct = await apiRequest('/api/products/custom-create', 'POST', {
      id: variantsProductId,
      variants: [
        { attributes: { Color: 'Blue', Size: 'Large' }, priceInINR: 850, inventory: 45 },
        { attributes: { Color: 'Green', Size: 'Large' }, priceInINR: 900, inventory: 20 }
      ]
    }, adminToken)
    report.assert('Case 5: Update product and upsert all new variants', newVariantsProduct.status === 201, 'Best Case', `Status: ${newVariantsProduct.status}, Body: ${JSON.stringify(newVariantsProduct.body)}`)
  } else {
    report.assert('Case 5: Update product and upsert all new variants', false, 'Best Case', 'Skipped because variant product creation failed')
  }

  // Case 6: Update a product and upsert variants (mixed)
  if (variantsProductId && newVariantsProduct && newVariantsProduct.body?.variants?.length > 0) {
    const savedVariantsArr = newVariantsProduct.body.variants
    const existingVariantId = savedVariantsArr && savedVariantsArr.length > 0 ? savedVariantsArr[0].id : null
    
    if (existingVariantId) {
      const mixedVariantsRes = await apiRequest('/api/products/custom-create', 'POST', {
        id: variantsProductId,
        variants: [
          {
            id: existingVariantId,
            attributes: { Color: 'Blue', Size: 'Large' },
            priceInINR: 950,
            inventory: 45
          },
          {
            attributes: { Color: 'Green', Size: 'Small' },
            priceInINR: 900,
            inventory: 25
          }
        ]
      }, adminToken)
      report.assert('Case 6: Update product and upsert variants (mixed)', mixedVariantsRes.status === 201, 'Best Case', `Status: ${mixedVariantsRes.status}, Body: ${JSON.stringify(mixedVariantsRes.body)}`)
    } else {
      report.assert('Case 6: Update product and upsert variants (mixed)', false, 'Best Case', 'Skipped because unable to extract variant ID from previous step')
    }
  } else {
    report.assert('Case 6: Update product and upsert variants (mixed)', false, 'Best Case', 'Skipped because previous variant update failed or no variants returned')
  }
}
