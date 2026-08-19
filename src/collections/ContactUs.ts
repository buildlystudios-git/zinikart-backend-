import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/isAdmin'

export const ContactUs: CollectionConfig = {
  slug: 'contact-us',
  labels: {
    singular: 'Contact Request',
    plural: 'Contact Requests',
  },
  admin: {
    useAsTitle: 'subject',
    group: 'Support',
    defaultColumns: ['fullName', 'email', 'subject', 'status', 'createdAt'],
  },
  access: {
    create: () => true, // Public access: Anyone can submit a form
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Resolved', value: 'resolved' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
