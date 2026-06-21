import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOrFieldOwner } from '@/access/adminOrFieldOwner'
import { setOwner } from './hooks/setOwner'
import { validateWishlist } from './hooks/validateWishlist'

export const Wishlists: CollectionConfig = {
  slug: 'wishlists',
  access: {
    create: isAuthenticated,
    read: adminOrFieldOwner('customer'),
    update: adminOrFieldOwner('customer'),
    delete: adminOrFieldOwner('customer'),
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['product', 'customer', 'createdAt'],
    group: 'Profiles',
  },
  hooks: {
    beforeValidate: [validateWishlist],
    beforeChange: [setOwner],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
}
