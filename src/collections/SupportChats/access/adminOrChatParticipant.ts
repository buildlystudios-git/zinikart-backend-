import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

export const adminOrChatParticipant: Access = ({ req: { user } }) => {
  if (!user) return false

  if (checkRole(['admin'], user)) {
    return true
  }

  return {
    initiator: {
      equals: user.id,
    },
  }
}
