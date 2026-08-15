import type { CollectionBeforeChangeHook } from 'payload'
import { checkRole } from '@/access/utilities'

export const assignInitiator: CollectionBeforeChangeHook = ({ req, data, operation }) => {
  if (operation === 'create' && req.user) {
    if (!data.initiator) {
      data.initiator = req.user.id
    }
    
    if (!data.initiatorType) {
      if (checkRole(['customer'], req.user)) {
        data.initiatorType = 'customer'
      } else if (checkRole(['retailer'], req.user)) {
        data.initiatorType = 'retailer'
      } else if (checkRole(['delivery_partner'], req.user)) {
        data.initiatorType = 'delivery_partner'
      } else if (checkRole(['admin'], req.user)) {
        data.initiatorType = 'admin'
      }
    }
  }

  return data
}
