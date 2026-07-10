import type { CollectionBeforeChangeHook } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'

export const statusHistoryLogger: CollectionBeforeChangeHook = async ({ data, req, operation, originalDoc }) => {
  if (operation === 'create' || (operation === 'update' && data.status !== originalDoc?.status)) {
    const history = [...(data.statusHistory || originalDoc?.statusHistory || [])]
    
    let changeSource = 'system'
    if (req.context?.changeSource) {
      changeSource = req.context.changeSource as string
    } else if (req.user) {
      if (req.user.roles?.includes('retailer')) {
        changeSource = 'retailer'
      } else if (req.user.roles?.includes('delivery_partner')) {
        changeSource = 'delivery_partner'
      } else if (req.user.roles?.includes('admin')) {
        changeSource = 'admin'
      } else {
        changeSource = 'customer'
      }
    }

    history.push({
      status: data.status || ORDER_STATUS.PLACED,
      timestamp: new Date().toISOString(),
      changedBy: req.user ? req.user.id : null,
      changeSource,
    })

    data.statusHistory = history
  }
  return data
}
