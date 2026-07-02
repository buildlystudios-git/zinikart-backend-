import type { CollectionBeforeChangeHook } from 'payload'
import { checkRole } from '@/access/utilities'

export const restrictDeliveryPartnerFields: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const user = req.user
  if (operation === 'update' && user && checkRole(['delivery_partner'], user) && !checkRole(['admin'], user)) {
    // 1. Revert all fields except status and codCollectionRecord to their original values
    const allowedFields = ['status', 'codCollectionRecord']
    const keys = Object.keys(data)
    for (const key of keys) {
      if (!allowedFields.includes(key)) {
        data[key] = originalDoc[key]
      }
    }

    // 2. Auto-populate codCollectionRecord when status changes to completed
    if (data.status === 'completed' && originalDoc.status !== 'completed') {
      try {
        // Check if it's a COD order by checking linked transactions
        const transactionIds = originalDoc.transactions || []
        let isCod = false
        for (const txId of transactionIds) {
          const id = typeof txId === 'object' ? txId.id : txId
          const tx = await req.payload.findByID({
            collection: 'transactions',
            id,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (tx && tx.paymentMethod === 'cod') {
            isCod = true
            break
          }
        }

        if (isCod) {
          const deliveryPartnerDocs = await req.payload.find({
            collection: 'delivery-partners',
            where: {
              user: {
                equals: user.id,
              },
            },
            depth: 0,
            overrideAccess: true,
            req,
          })

          const partnerId = deliveryPartnerDocs.docs[0]?.id
          if (partnerId) {
            data.codCollectionRecord = {
              ...(data.codCollectionRecord || {}),
              status: 'collected',
              collectedAt: new Date().toISOString(),
              collectedBy: partnerId,
              paymentType: data.codCollectionRecord?.paymentType || 'cash',
            }
          }
        }
      } catch (err: any) {
        req.payload.logger.error(`Error populating COD collection record in restrictDeliveryPartnerFields: ${err.message}`)
      }
    }
  }

  return data
}
