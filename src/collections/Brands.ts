import { slugField } from 'payload'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOrRetailer } from '@/access/adminOrRetailer'

export const Brands: CollectionConfig = {
  slug: 'brands',
  access: {
    create: adminOrRetailer,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'featured', 'categories', 'createdAt'],
    group: 'Products',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Brand Name',
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      label: 'Brand Logo',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Overview',
      required: false,
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Featured Status',
      defaultValue: false,
    },
    {
      name: 'categories',
      type: 'relationship',
      label: 'Associated Categories',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    slugField({
      fieldToUse: 'name',
    }),
  ],
}
