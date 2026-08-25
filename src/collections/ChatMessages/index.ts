import type { CollectionConfig } from 'payload'
import { canAccessChatMessage } from './access/canAccessChatMessage'
import { assignSender } from './hooks/assignSender'
import { updateChatLastMessage } from './hooks/updateChatLastMessage'
import { isAdmin } from '@/access/isAdmin'
import { isAuthenticated } from '@/access/isAuthenticated'

export const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['chat', 'sender', 'senderRole', 'createdAt'],
    group: 'Support',
  },
  access: {
    create: isAuthenticated,
    read: canAccessChatMessage,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [assignSender],
    afterChange: [updateChatLastMessage],
  },
  fields: [
    {
      name: 'chat',
      type: 'relationship',
      relationTo: 'support-chats',
      required: true,
      index: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'senderRole',
      type: 'select',
      required: true,
      options: [
        { label: 'Customer', value: 'customer' },
        { label: 'Retailer', value: 'retailer' },
        { label: 'Delivery Partner', value: 'delivery_partner' },
        { label: 'Admin', value: 'admin' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'content',
      type: 'textarea',
      admin: {
        condition: (data) => !data?.attachments?.length,
      }
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'chat-media',
      hasMany: true,
    },
    {
      name: 'messageType',
      type: 'select',
      defaultValue: 'text',
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Image', value: 'image' },
        { label: 'File', value: 'file' },
        { label: 'System', value: 'system' },
      ],
    },
    {
      name: 'readBy',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        { name: 'user', type: 'relationship', relationTo: 'users', required: true },
        { name: 'readAt', type: 'date', required: true },
      ],
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
