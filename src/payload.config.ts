import { postgresAdapter } from '@payloadcms/db-postgres'
import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { initFirebase } from '@/lib/firebase'

import { Categories } from '@/collections/Categories'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Users } from '@/collections/Users'
import { Retailers } from '@/collections/Retailers'
import { DeliveryPartners } from '@/collections/DeliveryPartners'
import { Brands } from '@/collections/Brands'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { Ratings } from '@/collections/Ratings'
import { Wishlists } from '@/collections/Wishlists'
import { PushNotificationLogs } from '@/collections/PushNotificationLogs'
import { plugins } from './plugins'
import { productDetailsEndpoint } from '@/endpoints/mobile/catalog/productDetails'
import { searchEndpoint } from '@/endpoints/mobile/search/index'
import { assignDeliveryPartnerTask } from '@/jobs/assignDeliveryPartner'
import { checkOfferTimeoutTask } from '@/jobs/checkOfferTimeout'
import { retailerActionTimeoutTask } from '@/jobs/retailerActionTimeout'
import { processRazorpayRefundTask } from '@/jobs/processRazorpayRefund'
import { sendFcmTaskHandler } from '@/jobs/tasks/sendFcm'
import { pruneTokensTaskHandler } from '@/jobs/tasks/pruneTokens'
import { writeNotificationLogTaskHandler } from '@/jobs/tasks/writeNotificationLog'
import { dispatchPushNotificationWorkflow } from '@/jobs/workflows/dispatchPushNotification'
import { registerFcmToken, unregisterFcmToken } from '@/endpoints/users/fcmToken'
import { DATABASE_URL, PAYLOAD_SECRET } from '@/constants/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard'],
    },
    user: Users.slug,
  },
  collections: [Users, Pages, Categories, Media, Retailers, DeliveryPartners, Brands, Ratings, Wishlists, PushNotificationLogs],
  db: postgresAdapter({
    idType: 'uuid',
    pool: {
      connectionString: DATABASE_URL,
    },
    schemaName: 'payload',
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages'],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  //email: nodemailerAdapter(),
  endpoints: [
    productDetailsEndpoint,
    searchEndpoint,
    registerFcmToken,
    unregisterFcmToken,
  ],
  globals: [Header, Footer],
  plugins,
  secret: PAYLOAD_SECRET,
  onInit: async (payload) => {
    initFirebase()
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    autoRun: [
      {
        cron: '* * * * * *', // Run every second for local development
      },
    ],
    enableConcurrencyControl: true,
    access: {
      run: () => true,
    },
    tasks: [
      {
        slug: 'assignDeliveryPartner',
        inputSchema: [
          { name: 'orderId', type: 'text', required: true }
        ],
        handler: assignDeliveryPartnerTask,
      },
      {
        slug: 'checkOfferTimeout',
        inputSchema: [
          { name: 'orderId', type: 'text', required: true },
          { name: 'candidateId', type: 'text', required: true },
        ],
        handler: checkOfferTimeoutTask,
      },
      {
        slug: 'retailerActionTimeout',
        inputSchema: [
          { name: 'orderId', type: 'text', required: true }
        ],
        handler: retailerActionTimeoutTask,
      },
      {
        slug: 'processRazorpayRefund',
        inputSchema: [
          { name: 'transactionId', type: 'text', required: true }
        ],
        handler: processRazorpayRefundTask,
      },
      {
        slug: 'sendFcm',
        inputSchema: [
          { name: 'recipientUserId', type: 'text', required: true },
          { name: 'templateKey', type: 'text', required: true },
          { name: 'templateData', type: 'json' },
        ],
        outputSchema: [
          { name: 'success', type: 'checkbox' },
          { name: 'successCount', type: 'number' },
          { name: 'failureCount', type: 'number' },
          { name: 'invalidTokens', type: 'json' },
          { name: 'notificationTitle', type: 'text' },
          { name: 'notificationBody', type: 'text' },
        ],
        retries: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
        handler: sendFcmTaskHandler,
      },
      {
        slug: 'pruneTokens',
        inputSchema: [
          { name: 'recipientUserId', type: 'text', required: true },
          { name: 'invalidTokens', type: 'json', required: true },
        ],
        outputSchema: [
          { name: 'success', type: 'checkbox' },
          { name: 'prunedCount', type: 'number' },
        ],
        handler: pruneTokensTaskHandler,
      },
      {
        slug: 'writeNotificationLog',
        inputSchema: [
          { name: 'recipientUserId', type: 'text', required: true },
          { name: 'templateKey', type: 'text', required: true },
          { name: 'notificationTitle', type: 'text' },
          { name: 'notificationBody', type: 'text' },
          { name: 'successCount', type: 'number' },
          { name: 'failureCount', type: 'number' },
        ],
        outputSchema: [
          { name: 'success', type: 'checkbox' },
          { name: 'logCreated', type: 'checkbox' },
          { name: 'error', type: 'text' },
        ],
        handler: writeNotificationLogTaskHandler,
      },
    ],
    workflows: [
      {
        slug: 'dispatchPushNotification',
        inputSchema: [
          { name: 'recipientUserId', type: 'text', required: true },
          { name: 'templateKey', type: 'text', required: true },
          { name: 'templateData', type: 'json' },
        ],
        handler: dispatchPushNotificationWorkflow,
      },
    ],
  },
})
