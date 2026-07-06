import type { CollectionBeforeChangeHook } from 'payload'

export const associateUser: CollectionBeforeChangeHook = ({ req, operation, data }) => {
  if (operation === 'create' && req.user && !data.user) {
    data.user = req.user.id
  }
  return data
}
