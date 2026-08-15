import type { CollectionBeforeChangeHook } from 'payload'
import { checkRole } from '@/access/utilities'
import { APIError } from 'payload'

export const assignSender: CollectionBeforeChangeHook = async ({ req, data, operation }) => {
  if (operation === 'create' && req.user) {
    if (!data.sender) {
      data.sender = req.user.id
    }
    
    if (!data.senderRole) {
      if (checkRole(['customer'], req.user)) {
        data.senderRole = 'customer'
      } else if (checkRole(['retailer'], req.user)) {
        data.senderRole = 'retailer'
      } else if (checkRole(['delivery_partner'], req.user)) {
        data.senderRole = 'delivery_partner'
      } else if (checkRole(['admin'], req.user)) {
        data.senderRole = 'admin'
      }
    }

    // Security check: ensure the sender is actually part of this chat
    if (data.chat && !checkRole(['admin'], req.user)) {
      const chat = await req.payload.findByID({
        collection: 'support-chats',
        id: data.chat,
        depth: 0,
        req, // Keep transaction
      })

      if (chat.initiator !== req.user.id) {
        throw new APIError('You do not have permission to send messages to this chat.', 403)
      }
    }
  }

  return data
}
