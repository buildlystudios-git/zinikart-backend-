import type { CollectionBeforeChangeHook } from 'payload'

export const deductInventory: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === 'create') {
    const payload = req.payload
    const items = data.items || []
    for (const item of items) {
      const productID = typeof item.product === 'object' ? item.product.id : item.product
      const variantID = item.variant
        ? typeof item.variant === 'object'
          ? item.variant.id
          : item.variant
        : undefined

      if (variantID) {
        const variant = await payload.findByID({
          collection: 'variants',
          id: variantID,
          req,
        })
        const currentInventory = variant.inventory || 0
        if (currentInventory < item.quantity) {
          throw new Error(`Insufficient inventory for variant "${variant.title || variantID}". Only ${currentInventory} left.`)
        }
        await payload.update({
          collection: 'variants',
          id: variantID,
          data: {
            inventory: currentInventory - item.quantity,
          },
          req,
        })
      } else if (productID) {
        const product = await payload.findByID({
          collection: 'products',
          id: productID,
          req,
        })
        const currentInventory = product.inventory || 0
        if (currentInventory < item.quantity) {
          throw new Error(`Insufficient inventory for product "${product.title || productID}". Only ${currentInventory} left.`)
        }
        await payload.update({
          collection: 'products',
          id: productID,
          data: {
            inventory: currentInventory - item.quantity,
          },
          req,
        })
      }
    }
  }
  return data
}
