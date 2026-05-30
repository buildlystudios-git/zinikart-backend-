import type { Access } from 'payload'

export const isAuthenticated: Access = ({ req }) => {
  return Boolean(req.user)
}
