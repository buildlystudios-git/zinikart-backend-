import type { FieldAccess } from 'payload'
import { checkRole } from '@/access/utilities'

/**
 * FieldAccess: allows admins, or the retailer who owns the document (matched via the `user` field).
 * Used for fields that should only be updated by the owning retailer or an admin.
 */
export const adminOrRetailerOwnerFieldAccess: FieldAccess = ({ req: { user }, doc }) => {
  if (!user) return false
  if (checkRole(['admin'], user)) return true

  // Compare logged-in user ID against the `user` relationship field on the document
  const docUserId = doc?.user && typeof doc.user === 'object' ? doc.user.id : doc?.user
  return docUserId === user.id
}
