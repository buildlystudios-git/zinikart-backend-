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

import { Categories } from '@/collections/Categories'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Users } from '@/collections/Users'
import { Retailers } from '@/collections/Retailers'
import { DeliveryPartners } from '@/collections/DeliveryPartners'
import { Brands } from '@/collections/Brands'
import { SupportChats } from '@/collections/SupportChats'
import { ChatMessages } from '@/collections/ChatMessages'
import { ChatMedia } from '@/collections/ChatMedia'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { AgentSettings } from '@/globals/AgentSettings'
import { Ratings } from '@/collections/Ratings'
import { Wishlists } from '@/collections/Wishlists'
import { ContactUs } from '@/collections/ContactUs'
import { plugins } from './plugins'
import { mobileEndpoints } from '@/endpoints/mobile'
import { assignDeliveryPartnerTask } from '@/jobs/assignDeliveryPartner'
import { checkOfferTimeoutTask } from '@/jobs/checkOfferTimeout'
import { retailerActionTimeoutTask } from '@/jobs/retailerActionTimeout'
import { processRazorpayRefundTask } from '@/jobs/processRazorpayRefund'
import { DATABASE_URL, PAYLOAD_SECRET } from '@/constants/env'
import { PlatformSettings } from '@/globals/PlatformSettings'
import { PayoutLedger } from '@/collections/PayoutLedger'
import { PayoutInvoice } from '@/collections/PayoutInvoice'
import { processPayoutsTask } from '@/jobs/processPayouts'

import { myLedgerEndpoint, myInvoicesEndpoint, invoiceDetailEndpoint } from '@/endpoints/payouts'
import { supportChatEndpoints } from '@/endpoints/support-chat'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Logo#Icon',
      },
      views: {
        dashboard: {
          Component: '@/components/admin/DashboardView',
        },
        categoryBrands: {
          Component: '@/components/admin/views/CategoryBrandsPage',
          path: '/categories/:categoryId/brands',
        },
        categoryBrandProducts: {
          Component: '@/components/admin/views/CategoryBrandProductsPage',
          path: '/categories/:categoryId/brands/:brandId/products',
        },
      },
    },
  },
  collections: [Users, Pages, Categories, Media, Retailers, DeliveryPartners, Brands, Ratings, Wishlists, PayoutLedger, PayoutInvoice, SupportChats, ChatMessages, ChatMedia, ContactUs],
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
    ...mobileEndpoints,
    myLedgerEndpoint,
    myInvoicesEndpoint,
    invoiceDetailEndpoint,
    ...supportChatEndpoints,
  ],
  globals: [Header, Footer, AgentSettings, PlatformSettings],
  plugins,
  secret: PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
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
        slug: 'processPayouts',
        inputSchema: [],
        handler: processPayoutsTask,
      },
    ],
    workflows: [
      {
        slug: 'hourlyPayoutCheck',
        schedule: [{ cron: '0 * * * *', queue: 'default' }],
        handler: async ({ tasks }) => {
          await tasks.processPayouts!('1', { input: {} })
        },
      },
    ],
  },
})
