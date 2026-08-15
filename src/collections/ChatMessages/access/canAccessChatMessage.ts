import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

export const canAccessChatMessage: Access = ({ req: { user } }) => {
  if (!user) return false

  if (checkRole(['admin'], user)) {
    return true
  }

  return {
    'chat.initiator': {
      equals: user.id,
    },
  }
}
