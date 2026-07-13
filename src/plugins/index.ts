import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Plugin } from 'payload'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import { razorpayAdapter } from '@/plugins/payments/razorpay'
import { 
  RAZORPAY_KEY_ID, 
  RAZORPAY_KEY_SECRET, 
  RAZORPAY_WEBHOOK_SECRET, 
  STRIPE_SECRET_KEY, 
  STRIPE_PUBLISHABLE_KEY, 
  STRIPE_WEBHOOK_SECRET 
} from '@/constants/env'
import { ORDER_STATUS_OPTIONS } from '@/constants/orderStatuses'

import { Page, Product } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { ProductsCollection } from '@/collections/Products'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { mobileOtpAuthPlugin, mobileOtpAuthPaths } from '@/plugins/mobileOtpAuth'
import { openapi, swaggerUI } from 'payload-oapi'
import { mobileCatalogPaths } from '@/endpoints/mobile/catalog/openapi'
import { mobileSearchPaths } from '@/endpoints/mobile/search/openapi'
import { seedPaths } from '@/endpoints/seed/openapi'
import { cartPaths } from '@/endpoints/cart/openapi'
import { paymentPaths } from '@/endpoints/payments/openapi'
import { usersAuthPaths } from '@/endpoints/users/openapi'
import { retailerAnalyticsPaths } from '@/endpoints/retailers/openapi'
import { orderPaths } from '@/endpoints/orders/openapi'
import { deliveryPartnerPaths } from '@/endpoints/delivery-partners/openapi'
import { deductInventory } from '@/hooks/deductInventory'
import { codAdapter } from '@/plugins/payments/cod'
import { orderUpdateAccess } from '@/access/orderUpdateAccess'
import { restrictDeliveryPartnerFields } from '@/hooks/restrictDeliveryPartnerFields'
import { confirmCodTransaction } from '@/hooks/confirmCodTransaction'
import { validateSingleVendor } from '@/collections/Orders/hooks/validateSingleVendor'
import { statusHistoryLogger } from '@/collections/Orders/hooks/statusHistoryLogger'
import { triggerSideEffects } from '@/collections/Orders/hooks/triggerSideEffects'
import { handoverOtpValidation } from '@/collections/Orders/hooks/handoverOtpValidation'
import { retailerActionEndpoint, deliveryActionEndpoint } from '@/endpoints/orders/actions'
import { statusUpdateEndpoint } from '@/endpoints/orders/statusUpdate'
import { transactionsAfterChange } from '@/hooks/transactionsAfterChange'

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Ecommerce Template` : 'Payload Ecommerce Template'
}

const generateURL: GenerateURL<Product | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const openapiEnhancerPlugin = (): Plugin => (config) => {
  const specEndpoint = config.endpoints?.find(
    (e) => e.path === '/openapi.json' && e.method === 'get',
  )

  if (specEndpoint) {
    const originalHandler = specEndpoint.handler
    specEndpoint.handler = async (req) => {
      const response = await originalHandler(req)
      if (response && typeof response === 'object' && 'json' in response && typeof (response as any).json === 'function') {
        const spec = await (response as any).json()
        if (!spec.paths) {
          spec.paths = {}
        }

        spec.paths = {
          ...spec.paths,
          ...mobileOtpAuthPaths,
          ...mobileCatalogPaths,
          ...mobileSearchPaths,
          ...seedPaths,
          ...cartPaths,
          ...paymentPaths,
          ...usersAuthPaths,
          ...retailerAnalyticsPaths,
          ...orderPaths,
          ...deliveryPartnerPaths,
        }

        if (!spec.components) {
          spec.components = {}
        }
        if (!spec.components.securitySchemes) {
          spec.components.securitySchemes = {}
        }

        // Replace the default oauth2 password flow with direct API key / JWT header authentication
        spec.components.securitySchemes.ApiKey = {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Enter JWT token with prefix (e.g. "JWT <token>" or "Bearer <token>").',
        }

        spec.components.securitySchemes.BearerAuth = {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token (value only).',
        }

        spec.components.securitySchemes.CookieAuth = {
          type: 'apiKey',
          in: 'cookie',
          name: 'payload-token',
          description: 'Authenticate using payload-token cookie.',
        }

        return Response.json(spec)
      }
      return response
    }
  }

  return config
}

export const plugins: Plugin[] = [
  mobileOtpAuthPlugin({
    usersSlug: 'users',
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      access: {
        delete: isAdmin,
        read: isAdmin,
        update: isAdmin,
      },
      admin: {
        group: 'Content',
      },
    },
    formOverrides: {
      access: {
        delete: isAdmin,
        read: isAdmin,
        update: isAdmin,
        create: isAdmin,
      },
      admin: {
        group: 'Content',
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  ecommercePlugin({
    access: {
      adminOnlyFieldAccess,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
      isAdmin,
      isDocumentOwner,
    },
    currencies: {
      supportedCurrencies: [
        {
          code: 'INR',
          decimals: 2,
          label: 'Indian Rupee',
          symbol: '₹',
        },
      ],
      defaultCurrency: 'INR',
    },
    addresses: {
      addressFields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'lat',
          type: 'number',
          label: 'Latitude',
          admin: {
            placeholder: 'e.g. 28.6139',
          },
        },
        {
          name: 'lng',
          type: 'number',
          label: 'Longitude',
          admin: {
            placeholder: 'e.g. 77.2090',
          },
        },
      ],
      addressesCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        admin: {
          ...defaultCollection.admin,
          hidden: false,
        },
      }),
    },
    customers: {
      slug: 'users',
    },
    orders: {
      ordersCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        access: {
          ...defaultCollection.access,
          update: orderUpdateAccess,
        },
        hooks: {
          ...defaultCollection.hooks,
          beforeValidate: [
            ...(defaultCollection.hooks?.beforeValidate || []),
            validateSingleVendor,
            handoverOtpValidation,
          ],
          beforeChange: [
            ...(defaultCollection.hooks?.beforeChange || []),
            statusHistoryLogger,
            deductInventory,
            restrictDeliveryPartnerFields,
          ],
          afterChange: [
            ...(defaultCollection.hooks?.afterChange || []),
            triggerSideEffects,
            confirmCodTransaction,
          ],
        },
        endpoints: [
          ...(defaultCollection.endpoints || []),
          retailerActionEndpoint,
          deliveryActionEndpoint,
          statusUpdateEndpoint,
        ],
        fields: [
          ...defaultCollection.fields.filter((f) => !('name' in f && f.name === 'status')),
          {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'placed',
            options: [...ORDER_STATUS_OPTIONS],
          },
          {
            name: 'retailer',
            type: 'relationship',
            relationTo: 'retailers',
            required: true,
            admin: { position: 'sidebar' },
          },
          {
            name: 'paymentMethod',
            type: 'text',
            admin: { position: 'sidebar', readOnly: true },
          },
          {
            name: 'statusHistory',
            type: 'array',
            admin: { position: 'sidebar' },
            fields: [
              { name: 'status', type: 'text', required: true },
              { name: 'timestamp', type: 'date', required: true },
              { name: 'changedBy', type: 'relationship', relationTo: 'users', required: false },
              {
                name: 'changeSource',
                type: 'select',
                required: true,
                options: [
                  { label: 'Retailer', value: 'retailer' },
                  { label: 'Delivery Partner', value: 'delivery_partner' },
                  { label: 'Customer', value: 'customer' },
                  { label: 'Admin', value: 'admin' },
                  { label: 'System', value: 'system' },
                ],
              },
            ],
          },
          {
            name: 'accessToken',
            type: 'text',
            unique: true,
            index: true,
            admin: {
              position: 'sidebar',
              readOnly: true,
            },
            hooks: {
              beforeValidate: [
                ({ value, operation }) => {
                  if (operation === 'create' || !value) {
                    return crypto.randomUUID()
                  }
                  return value
                },
              ],
            },
          },
          {
            name: 'deliveryPartner',
            type: 'relationship',
            relationTo: 'delivery-partners',
            required: false,
            access: {
              update: adminOnlyFieldAccess,
            },
            admin: {
              position: 'sidebar',
              description: 'The assigned delivery partner for this order',
            },
          },
          {
            name: 'deliveryPartnerAcceptance',
            type: 'select',
            defaultValue: 'pending',
            options: [
              { label: 'Pending', value: 'pending' },
              { label: 'Accepted', value: 'accepted' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Unassignable', value: 'unassignable' },
            ],
            admin: { position: 'sidebar' },
          },
          {
            name: 'rejectedDeliveryPartners',
            type: 'relationship',
            relationTo: 'delivery-partners',
            hasMany: true,
            admin: { position: 'sidebar' },
          },
          {
            name: 'currentOfferedPartner',
            type: 'relationship',
            relationTo: 'delivery-partners',
            admin: { position: 'sidebar' },
          },
          {
            name: 'offerExpiresAt',
            type: 'date',
            admin: { position: 'sidebar' },
          },
          {
            name: 'pickupOTP',
            type: 'text',
            admin: { readOnly: true },
          },
          {
            name: 'deliveryOTP',
            type: 'text',
            admin: { readOnly: true },
          },
          {
            name: 'cancellationDetails',
            type: 'group',
            fields: [
              { name: 'cancelledBy', type: 'relationship', relationTo: 'users' },
              { name: 'cancelledAt', type: 'date' },
              { name: 'cancellationReason', type: 'text' },
            ],
          },
          {
            name: 'codCollectionRecord',
            type: 'group',
            admin: {
              description: 'Doorstep COD payment collection log',
            },
            fields: [
              {
                name: 'status',
                type: 'select',
                options: [
                  { label: 'Pending', value: 'pending' },
                  { label: 'Collected', value: 'collected' },
                ],
                defaultValue: 'pending',
              },
              {
                name: 'collectedAt',
                type: 'date',
                admin: {
                  readOnly: true,
                },
              },
              {
                name: 'paymentType',
                type: 'select',
                options: [
                  { label: 'Cash', value: 'cash' },
                  { label: 'Online QR', value: 'qr' },
                ],
              },
              {
                name: 'collectedBy',
                type: 'relationship',
                relationTo: 'delivery-partners',
                admin: {
                  readOnly: true,
                },
              },
            ],
          },
        ],
      }),
    },
    transactions: {
      transactionsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        hooks: {
          ...defaultCollection.hooks,
          afterChange: [
            ...(defaultCollection.hooks?.afterChange || []),
            transactionsAfterChange,
          ],
        },
      }),
    },
    payments: {
      paymentMethods: [
        stripeAdapter({
          secretKey: STRIPE_SECRET_KEY,
          publishableKey: STRIPE_PUBLISHABLE_KEY,
          webhookSecret: STRIPE_WEBHOOK_SECRET,
        }),
        razorpayAdapter({
          keyId: RAZORPAY_KEY_ID,
          keySecret: RAZORPAY_KEY_SECRET,
          webhookSecret: RAZORPAY_WEBHOOK_SECRET,
        }),
        codAdapter(),
      ],
    },
    products: {
      productsCollectionOverride: ProductsCollection,
      variants: {
        variantsCollectionOverride: ({ defaultCollection }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            group: 'Ecommerce',
            hidden: false,
          },
        }),
        variantOptionsCollectionOverride: ({ defaultCollection }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            group: 'Ecommerce',
            hidden: false,
          },
        }),
        variantTypesCollectionOverride: ({ defaultCollection }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            group: 'Ecommerce',
            hidden: false,
          },
        }),
      },
    },
  }),
  openapi({
    specEndpoint: '/openapi.json',
    openapiVersion: '3.0',
    metadata: {
      title: 'Ecommerce API',
      version: '1.0.0',
      description: 'API documentation',
    },
  }),
  openapiEnhancerPlugin(),
  swaggerUI({
    docsUrl: '/docs',
    specEndpoint: '/openapi.json',
  }),
]

