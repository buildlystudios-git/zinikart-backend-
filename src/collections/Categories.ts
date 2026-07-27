import { slugField } from 'payload'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOrRetailer } from '@/access/adminOrRetailer'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: adminOrRetailer,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brands'],
    group: 'Products',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Category Name',
      required: true,
    },
    {
      name: 'parentCategory',
      type: 'relationship',
      label: 'Parent Category',
      relationTo: 'categories',
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'specificationTemplates',
      type: 'array',
      label: 'Specification Templates',
      admin: {
        description: 'Define the standard specifications for products under this category.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Field Name',
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'text',
          options: [
            { label: 'Plain Text', value: 'text' },
            { label: 'Numeric Value', value: 'number' },
            { label: 'Preset Options', value: 'select' },
            { label: 'Date', value: 'date' },
          ],
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'select',
          },
          fields: [
            {
              name: 'option',
              type: 'text',
              required: true,
              label: 'Option Value',
            },
          ],
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
          label: 'Required',
        },
      ],
    },
    {
      name: 'brands',
      type: 'join',
      label: 'Associated Brands',
      collection: 'brands',
      on: 'categories',
      admin: {
        allowCreate: false,
        defaultColumns: ['name', 'featured'],
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}
