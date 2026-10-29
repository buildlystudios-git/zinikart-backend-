import type { CollectionAfterChangeHook } from 'payload'

export const syncUserName: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if ((operation === 'create' || operation === 'update') && doc.user) {
    try {
      const user = await req.payload.findByID({
        collection: 'users',
        id: typeof doc.user === 'string' ? doc.user : doc.user.id,
      })

      const dataToUpdate: any = {}
      if (user && user.name !== doc.ownerName) {
        dataToUpdate.name = doc.ownerName
      }
      if (user && user.retailerOnlineStatus !== doc.onlineStatus) {
        dataToUpdate.retailerOnlineStatus = doc.onlineStatus
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: dataToUpdate,
          req,
        })
      }
    } catch (error) {
      req.payload.logger.error({ err: error, doc: doc.id }, 'Error syncing Retailer ownerName to User name')
    }
  }

  return doc
}
