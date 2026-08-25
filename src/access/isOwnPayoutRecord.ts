import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

// Returns true for admin, or a query constraint { recipient: { equals: user.id } } for others
export const isOwnPayoutRecord: Access = ({ req }) => {
  if (!req.user) return false
  if (checkRole(['admin'], req.user)) return true
  return { recipient: { equals: req.user.id } }
}
