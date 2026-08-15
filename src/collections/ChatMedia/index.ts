import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOrChatParticipant } from '../SupportChats/access/adminOrChatParticipant'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const ChatMedia: CollectionConfig = {
  slug: 'chat-media',
  admin: {
    hidden: true,
  },
  access: {
    create: isAuthenticated,
    read: () => true, // Anyone can read chat media once they have the URL. If stricter access is needed, we'll need to check the chat relationships, but standard Payload upload access is just returning boolean
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    staticDir: path.resolve(dirname, '../../../public/chat-media'),
    mimeTypes: ['image/*', 'application/pdf', 'video/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
