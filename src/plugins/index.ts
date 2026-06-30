import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Plugin } from 'payload'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import { razorpayAdapter } from '@/plugins/payments/razorpay'

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
import { deductInventory } from '@/hooks/deductInventory'

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
        hooks: {
          ...defaultCollection.hooks,
          beforeChange: [
            ...(defaultCollection.hooks?.beforeChange || []),
            deductInventory,
          ],
        },
        fields: [
          ...defaultCollection.fields,
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
        ],
      }),
    },
    payments: {
      paymentMethods: [
        stripeAdapter({
          secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
          webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET || 'whsec_mock',
        }),
        razorpayAdapter({
          keyId: process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
          keySecret: process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock',
          webhookSecret: process.env.RAZORPAY_WEBHOOKS_SIGNING_SECRET,
        }),
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

