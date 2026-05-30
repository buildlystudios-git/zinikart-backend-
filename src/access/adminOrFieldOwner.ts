import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

export const adminOrFieldOwner =
  (fieldName = 'user'): Access =>
  ({ req: { user } }) => {
    if (user) {
      if (checkRole(['admin'], user)) {
        return true
      }

      return {
        [fieldName]: {
          equals: user.id,
        },
      }
    }

    return false
  }
