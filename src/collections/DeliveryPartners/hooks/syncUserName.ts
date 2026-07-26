import type { CollectionAfterChangeHook } from 'payload'

export const syncUserName: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if ((operation === 'create' || operation === 'update') && doc.user && doc.fullName) {
    try {
      const user = await req.payload.findByID({
        collection: 'users',
        id: typeof doc.user === 'string' ? doc.user : doc.user.id,
      })

      if (user && user.name !== doc.fullName) {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: {
            name: doc.fullName,
          },
          req,
        })
      }
    } catch (error) {
      req.payload.logger.error({ err: error, doc: doc.id }, 'Error syncing DeliveryPartner fullName to User name')
    }
  }

  return doc
}
