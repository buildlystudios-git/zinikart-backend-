import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOrSelf } from '@/access/adminOrSelf'
import { checkRole } from '@/access/utilities'

export const PushNotificationLogs: CollectionConfig = {
  slug: 'push-notification-logs',
  access: {
    create: () => false, // only system via jobs
    read: adminOrSelf, // Users can see their own logs if needed, but primarily for admin
    update: () => false,
    delete: adminOnly,
  },
  admin: {
    group: 'Ecommerce',
    useAsTitle: 'title',
    defaultColumns: ['recipient', 'title', 'status', 'sentAt'],
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'text',
      required: true,
    },
    {
      name: 'data',
      type: 'json',
      required: false,
    },
    {
      name: 'status',
      type: 'select',
      options: ['sent', 'failed'],
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'failureReason',
      type: 'text',
      admin: {
        condition: (data) => data.status === 'failed',
      },
    },
    {
      name: 'fcmMessageId',
      type: 'text',
      admin: { position: 'sidebar' },
    },
    {
      name: 'sentAt',
      type: 'date',
      required: true,
      admin: { position: 'sidebar' },
    },
  ],
}
