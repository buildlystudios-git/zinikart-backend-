import type { GlobalConfig } from 'payload'
import { isAdmin } from '@/access/isAdmin'

export const AgentSettings: GlobalConfig = {
  slug: 'agent-settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    group: 'Settings',
  },
  fields: [
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'openai',
      options: [
        { label: 'OpenAI', value: 'openai' },
        { label: 'Google Gemini', value: 'google' },
        { label: 'Anthropic', value: 'anthropic' },
        { label: 'Vercel AI', value: 'vercel' },
      ],
    },

    {
      name: 'apiKey',
      type: 'text',
      required: true,
      admin: {
        description: 'The API Key for the selected provider.',
      },
    },
    {
      name: 'allowedUsers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Admins automatically have access. Add any other specific users you want to grant access to the Agent here.',
      },
    },
  ],
}
