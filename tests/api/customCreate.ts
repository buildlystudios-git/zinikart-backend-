import type { Payload } from 'payload'
import { ReportManager, apiRequest } from './helpers'

export async function runCustomCreateTests(report: ReportManager, adminToken: string, retailerToken: string, payload: Payload) {
  report.setSuite('Custom Create Endpoint Tests')

  // Setup mock options for variants
  let optRed, optSmall, optLarge, optBlue, optGreen
  try {
    // 1. Create Variant Types
    let colorType = await payload.find({ collection: 'variantTypes', where: { name: { equals: 'color' } }, overrideAccess: true })
    if (!colorType.docs.length) {
      await payload.create({ collection: 'variantTypes', data: { label: 'Color', name: 'color' } as any, overrideAccess: true })
      colorType = await payload.find({ collection: 'variantTypes', where: { name: { equals: 'color' } }, overrideAccess: true })
    }
    
    let sizeType = await payload.find({ collection: 'variantTypes', where: { name: { equals: 'size' } }, overrideAccess: true })
    if (!sizeType.docs.length) {
      await payload.create({ collection: 'variantTypes', data: { label: 'Size', name: 'size' } as any, overrideAccess: true })
      sizeType = await payload.find({ collection: 'variantTypes', where: { name: { equals: 'size' } }, overrideAccess: true })
    }

    const cid = colorType.docs[0].id
    const sid = sizeType.docs[0].id

    // 2. Create Variant Options
    const opts = await payload.find({ collection: 'variantOptions', overrideAccess: true })
    optRed = opts.docs.find((o) => o.value === 'opt_red')
    optSmall = opts.docs.find((o) => o.value === 'opt_small')
    optLarge = opts.docs.find((o) => o.value === 'opt_large')
    optBlue = opts.docs.find((o) => o.value === 'opt_blue')
    optGreen = opts.docs.find((o) => o.value === 'opt_green')

    if (!optRed) optRed = await payload.create({ collection: 'variantOptions', data: { label: 'Red', value: 'opt_red', variantType: cid } as any, overrideAccess: true })
    if (!optSmall) optSmall = await payload.create({ collection: 'variantOptions', data: { label: 'Small', value: 'opt_small', variantType: sid } as any, overrideAccess: true })
    if (!optLarge) optLarge = await payload.create({ collection: 'variantOptions', data: { label: 'Large', value: 'opt_large', variantType: sid } as any, overrideAccess: true })
    if (!optBlue) optBlue = await payload.create({ collection: 'variantOptions', data: { label: 'Blue', value: 'opt_blue', variantType: cid } as any, overrideAccess: true })
    if (!optGreen) optGreen = await payload.create({ collection: 'variantOptions', data: { label: 'Green', value: 'opt_green', variantType: cid } as any, overrideAccess: true })
  } catch (e) {
    console.error('Failed to setup mock options', e)
  }

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
      { options: [optRed?.id, optSmall?.id], priceInINR: 799, inventory: 50 },
      { options: [optRed?.id, optLarge?.id], priceInINR: 849, inventory: 30 },
      { options: [optBlue?.id, optSmall?.id], priceInINR: 799, inventory: 40 }
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
        { options: [optBlue?.id, optLarge?.id], priceInINR: 850, inventory: 45 },
        { options: [optGreen?.id, optLarge?.id], priceInINR: 900, inventory: 20 }
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
            options: [optBlue?.id, optLarge?.id], // Original options from Case 5
            priceInINR: 950, // Update price
            inventory: 45
          },
          {
            options: [optGreen?.id, optSmall?.id], // New variant
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
