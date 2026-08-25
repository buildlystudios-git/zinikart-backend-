import type { CollectionConfig } from 'payload'
import { adminOrChatParticipant } from './access/adminOrChatParticipant'
import { assignInitiator } from './hooks/assignInitiator'
import { resolveMetadata } from './hooks/resolveMetadata'
import { isAdmin } from '@/access/isAdmin'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'

export const SupportChats: CollectionConfig = {
  slug: 'support-chats',
  admin: {
    useAsTitle: 'heading',
    defaultColumns: ['heading', 'type', 'status', 'initiator', 'createdAt'],
    group: 'Support',
    components: {
      views: {
        edit: {
          default: {
            Component: '@/components/admin/views/ChatEditView',
          }
        }
      }
    }
  },
  access: {
    create: isAuthenticated,
    read: adminOrChatParticipant,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [assignInitiator],
    afterChange: [resolveMetadata],
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'general_query',
      options: [
        { label: 'Order Issue', value: 'order_issue' },
        { label: 'General Query', value: 'general_query' },
        { label: 'Delivery Issue', value: 'delivery_issue' },
        { label: 'Payment Issue', value: 'payment_issue' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Pending', value: 'pending' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
      ],
      access: {
        update: adminOnlyFieldAccess,
      }
    },
    {
      name: 'initiator',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'initiatorType',
      type: 'select',
      required: true,
      options: [
        { label: 'Customer', value: 'customer' },
        { label: 'Retailer', value: 'retailer' },
        { label: 'Delivery Partner', value: 'delivery_partner' },
        { label: 'Admin', value: 'admin' }, // Fallback just in case
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'participants',
      type: 'array',
      admin: {
        description: 'Admins participating in this chat',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          defaultValue: 'admin',
          options: [{ label: 'Admin', value: 'admin' }],
        },
      ],
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'lastMessagePreview',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      access: {
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'rating',
      type: 'group',
      admin: {
        readOnly: true, // Should only be updated via the custom endpoint
      },
      fields: [
        { name: 'score', type: 'number', min: 1, max: 5 },
        { name: 'comment', type: 'text' },
        { name: 'ratedBy', type: 'relationship', relationTo: 'users' },
        { name: 'ratedAt', type: 'date' },
      ],
    },
    {
      name: 'resolvedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'resolvedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Opaque metadata for future AI agent integrations',
        position: 'sidebar',
      },
    },
  ],
}
