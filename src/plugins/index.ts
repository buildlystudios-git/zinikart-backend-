import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Plugin } from 'payload'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { s3Storage } from '@payloadcms/storage-s3'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import { razorpayAdapter } from '@/plugins/payments/razorpay'
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_ENDPOINT
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
import { mobileCategoriesPaths } from '@/endpoints/mobile/categories/openapi'
import { mobileBrandsPaths } from '@/endpoints/mobile/brands/openapi'
import { seedPaths } from '@/endpoints/seed/openapi'
import { cartPaths } from '@/endpoints/cart/openapi'
import { paymentPaths } from '@/endpoints/payments/openapi'
import { usersAuthPaths } from '@/endpoints/users/openapi'
import { retailerAnalyticsPaths } from '@/endpoints/retailers/openapi'
import { orderPaths } from '@/endpoints/orders/openapi'
import { deliveryPartnerPaths } from '@/endpoints/delivery-partners/openapi'
import { payoutPaths } from '@/endpoints/payouts/openapi'
import { productsPaths } from '@/collections/Products/endpoints/openapi'
import { supportChatPaths } from '@/endpoints/support-chat/openapi'
import { mobileHomePaths } from '@/endpoints/mobile/home/openapi'
import { deductInventory } from '@/hooks/deductInventory'
import { codAdapter } from '@/plugins/payments/cod'
import { orderUpdateAccess } from '@/access/orderUpdateAccess'
import { restrictDeliveryPartnerFields } from '@/hooks/restrictDeliveryPartnerFields'
import { confirmCodTransaction } from '@/hooks/confirmCodTransaction'
import { validateSingleVendor } from '@/collections/Orders/hooks/validateSingleVendor'
import { statusHistoryLogger } from '@/collections/Orders/hooks/statusHistoryLogger'
import { triggerSideEffects } from '@/collections/Orders/hooks/triggerSideEffects'
import { handoverOtpValidation } from '@/collections/Orders/hooks/handoverOtpValidation'
import { triggerPayoutLedger } from '@/collections/Orders/hooks/triggerPayoutLedger'
import { retailerActionEndpoint, deliveryActionEndpoint } from '@/endpoints/orders/actions'
import { statusUpdateEndpoint } from '@/endpoints/orders/statusUpdate'

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Ecommerce Template` : 'Payload Ecommerce Template'
}

const generateURL: GenerateURL<Product | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const NON_WRITABLE_INPUT_KEYS = new Set([
  // Pagination and System Metadata
  'hasNextPage',
  'hasPrevPage',
  'totalDocs',
  'limit',
  'totalPages',
  'page',
  'pagingCounter',
  'prevPage',
  'nextPage',
  'createdAt',
  'updatedAt',

  // Versioning, Status & Soft Delete
  '_status',
  'deletedAt',

  // Hook-Managed Auto-Assigned Relations (assigned via JWT token / hooks)
  'user',

  // Admin-Only / Access-Restricted Fields
  'approvalStatus',

  // Pre-Calculated Metrics (hook-calculated, never sent by user)
  'discountedPrice',
  'averageRating',
  'ratingCount',
  'soldCount',

  // Server-Generated Verification & Order Flow Tokens
  'orderNumber',
  'placedAt',
  'pickupOTP',
  'deliveryOTP',
  'resetPasswordToken',
  'resetPasswordExpiration',

  // Master Template Metadata
  'isMasterTemplate',
  'parentTemplate',
  // NOTE: 'id', 'total', 'subtotal', 'taxTotal' intentionally NOT in the global set.
  // - 'id' must be kept in nested array items (Payload uses it to track array row identity).
  // - 'total'/'subtotal'/'taxTotal' are too generic; they are excluded via readOnly detection below.
])

// Fields to exclude ONLY at the top-level (root) schema, not inside nested objects/array items.
const NON_WRITABLE_TOP_LEVEL_KEYS = new Set([
  'id',    // Document root ID — never sent in POST body, but keep inside nested array items
  'total',
  'subtotal',
  'taxTotal',
])

function isRelationshipUnion(unionArray: any[]): boolean {
  if (!Array.isArray(unionArray)) return false
  const hasString = unionArray.some((item: any) => item?.type === 'string')
  const hasObjectOrRef = unionArray.some(
    (item: any) => item?.$ref || item?.type === 'object' || (item?.properties && typeof item.properties === 'object'),
  )
  return hasString && hasObjectOrRef
}

// Check if a schema node is marked readOnly in the OpenAPI spec (set by payload-oapi or custom.openapi)
function isReadOnly(schema: any): boolean {
  return schema?.readOnly === true || schema?.['x-readOnly'] === true
}

function sanitizeRequestBodySchema(
  schema: any,
  schemasDict?: Record<string, any>,
  visitedObj = new Set<any>(),
  visitedRefs = new Set<string>(),
  isTopLevel = true,
): any {
  if (!schema || typeof schema !== 'object' || visitedObj.has(schema)) {
    return schema
  }
  visitedObj.add(schema)

  // Resolve $ref references without circular loops
  if (schema.$ref && typeof schema.$ref === 'string') {
    const refName = schema.$ref.replace('#/components/schemas/', '').replace('#/components/requestBodies/', '')
    if (visitedRefs.has(refName)) {
      return { type: 'string', description: `ID or reference of ${refName}` }
    }
    if (schemasDict && schemasDict[refName]) {
      const nextRefs = new Set(visitedRefs)
      nextRefs.add(refName)
      return sanitizeRequestBodySchema(JSON.parse(JSON.stringify(schemasDict[refName])), schemasDict, visitedObj, nextRefs, isTopLevel)
    }
  }

  // Detect and simplify Lexical RichText AST nodes in input schemas
  if (schema.properties?.root && schema.properties?.root?.properties?.children) {
    return {
      type: 'object',
      description: schema.description || 'RichText content object',
      example: { root: { type: 'root', children: [] } },
      nullable: true,
    }
  }

  // Detect and simplify single relationship unions (oneOf/anyOf containing string + object/$ref)
  // Guard: only simplify if it's SOLELY a relationship union, not a top-level allOf combiner
  // (allOf combiners are Payload versioning wrappers and must be traversed, not flattened)
  if (isRelationshipUnion(schema.oneOf) && !schema.allOf) {
    return { type: 'string', description: schema.description || 'ID of related document', nullable: true }
  }
  if (isRelationshipUnion(schema.anyOf) && !schema.allOf) {
    return { type: 'string', description: schema.description || 'ID of related document', nullable: true }
  }

  const cloned = Array.isArray(schema) ? [...schema] : { ...schema }

  // Filter out non-writable system & pagination properties from object schemas
  if (cloned.properties && typeof cloned.properties === 'object') {
    const newProps: Record<string, any> = {}
    for (const key of Object.keys(cloned.properties)) {
      const isGlobalNonWritable = NON_WRITABLE_INPUT_KEYS.has(key)
      const isTopLevelNonWritable = isTopLevel && NON_WRITABLE_TOP_LEVEL_KEYS.has(key)
      const propSchema = cloned.properties[key]

      // Skip: globally non-writable fields
      if (isGlobalNonWritable) continue

      // Skip: top-level-only non-writable fields (id, total, subtotal, taxTotal at root only)
      if (isTopLevelNonWritable) continue

      // Skip: fields marked readOnly by payload-oapi or custom.openapi annotation
      if (isReadOnly(propSchema)) continue

      // Detect and simplify Lexical RichText AST property
      if (propSchema?.properties?.root && propSchema?.properties?.root?.properties?.children) {
        newProps[key] = {
          type: 'object',
          description: propSchema.description || `RichText ${key} object`,
          example: { root: { type: 'root', children: [] } },
          nullable: true,
        }
      }
      // Detect and simplify single relationship union property
      else if (isRelationshipUnion(propSchema?.oneOf) || isRelationshipUnion(propSchema?.anyOf)) {
        newProps[key] = {
          type: 'string',
          description: propSchema.description || `ID of related ${key}`,
          nullable: true,
        }
      }
      // Detect and simplify array relationship union property (items has oneOf/anyOf)
      else if (
        propSchema?.type === 'array' &&
        propSchema?.items &&
        (isRelationshipUnion(propSchema.items.oneOf) || isRelationshipUnion(propSchema.items.anyOf))
      ) {
        newProps[key] = {
          type: 'array',
          items: { type: 'string' },
          description: propSchema.description || `IDs of related ${key}`,
          nullable: true,
        }
      }
      // Detect and simplify virtual join object generated by Payload containing hasNextPage or totalDocs
      else if (
        propSchema &&
        typeof propSchema === 'object' &&
        propSchema.properties &&
        ('hasNextPage' in propSchema.properties || 'totalDocs' in propSchema.properties)
      ) {
        newProps[key] = {
          type: 'array',
          items: { type: 'string' },
          description: propSchema.description || `IDs or references of related ${key}`,
          nullable: true,
        }
      } else {
        // Recurse — nested objects/array items are NOT top-level
        newProps[key] = sanitizeRequestBodySchema(propSchema, schemasDict, visitedObj, visitedRefs, false)
      }
    }
    cloned.properties = newProps
  }

  // Filter required fields array — remove both global and top-level non-writable keys
  if (Array.isArray(cloned.required)) {
    cloned.required = cloned.required.filter((key: string) => {
      if (NON_WRITABLE_INPUT_KEYS.has(key)) return false
      if (isTopLevel && NON_WRITABLE_TOP_LEVEL_KEYS.has(key)) return false
      return true
    })
  }

  // Traverse nested schema structures (always propagate isTopLevel=false into combiners)
  if (Array.isArray(cloned.allOf)) {
    cloned.allOf = cloned.allOf.map((sub: any) => sanitizeRequestBodySchema(sub, schemasDict, visitedObj, visitedRefs, isTopLevel))
  }
  if (Array.isArray(cloned.anyOf)) {
    cloned.anyOf = cloned.anyOf.map((sub: any) => sanitizeRequestBodySchema(sub, schemasDict, visitedObj, visitedRefs, false))
  }
  if (Array.isArray(cloned.oneOf)) {
    cloned.oneOf = cloned.oneOf.map((sub: any) => sanitizeRequestBodySchema(sub, schemasDict, visitedObj, visitedRefs, false))
  }
  if (cloned.items) {
    cloned.items = sanitizeRequestBodySchema(cloned.items, schemasDict, visitedObj, visitedRefs, false)
  }

  return cloned
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
          ...mobileCategoriesPaths,
          ...mobileBrandsPaths,
          ...seedPaths,
          ...cartPaths,
          ...paymentPaths,
          ...usersAuthPaths,
          ...retailerAnalyticsPaths,
          ...orderPaths,
          ...deliveryPartnerPaths,
          ...payoutPaths,
          ...productsPaths,
          ...supportChatPaths,
          ...mobileHomePaths,
        }

        // 1. Sanitize all reusable requestBodies generated by Payload CMS (e.g. CategoryRequestBody, BrandRequestBody, etc.)
        if (spec.components?.requestBodies) {
          for (const rbKey of Object.keys(spec.components.requestBodies)) {
            const reqBody = spec.components.requestBodies[rbKey]
            if (reqBody?.content) {
              for (const mediaType of Object.keys(reqBody.content)) {
                const mediaObj = reqBody.content[mediaType]
                if (mediaObj?.schema) {
                  mediaObj.schema = sanitizeRequestBodySchema(mediaObj.schema, spec.components?.schemas)
                }
              }
            }
          }
        }

        // 2. Sanitize requestBody schemas across all POST, PUT, and PATCH path operations
        for (const pathKey of Object.keys(spec.paths)) {
          const pathItem = spec.paths[pathKey]
          for (const method of ['post', 'put', 'patch'] as const) {
            const operation = pathItem?.[method]
            if (operation?.requestBody?.content) {
              for (const mediaType of Object.keys(operation.requestBody.content)) {
                const mediaObj = operation.requestBody.content[mediaType]
                if (mediaObj?.schema) {
                  mediaObj.schema = sanitizeRequestBodySchema(mediaObj.schema, spec.components?.schemas)
                }
              }
            }
          }
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
        hidden: true,
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
        hidden: true,
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
          hidden: true,
        },
      }),
    },
    customers: {
      slug: 'users',
    },
    orders: {
      ordersCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        admin: {
          ...defaultCollection.admin,
          group: 'Orders',
          defaultColumns: ['id', 'status', 'total', 'customer', 'retailer', 'createdAt'],
          components: {
            ...defaultCollection.admin?.components,
            views: {
              ...defaultCollection.admin?.components?.views,
              edit: {
                ...(defaultCollection.admin?.components?.views?.edit as any),
                default: {
                  ...(defaultCollection.admin?.components?.views?.edit as any)?.default,
                  Component: '@/components/admin/views/OrderEditView',
                },
              },
            },
          },
        },
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
            triggerPayoutLedger,
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
            label: 'Order Status',
            required: true,
            defaultValue: 'placed',
            options: [...ORDER_STATUS_OPTIONS],
          },
          {
            name: 'deliveryFee',
            type: 'number',
            label: 'Delivery Fee (₹)',
            defaultValue: 0,
            admin: {
              position: 'sidebar',
              description: 'Delivery fee charged to the customer for this order.',
            },
          },
          {
            name: 'retailer',
            type: 'relationship',
            label: 'Fulfilling Retailer',
            relationTo: 'retailers',
            required: true,
            admin: { position: 'sidebar' },
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
    carts: {
      cartsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        admin: {
          ...defaultCollection.admin,
          hidden: true,
        },
      }),
    },
    transactions: {
      transactionsCollectionOverride: ({ defaultCollection }) => ({
        ...defaultCollection,
        admin: {
          ...defaultCollection.admin,
          group: 'Finance',
          defaultColumns: ['id', 'status', 'amount', 'currency', 'order', 'createdAt'],
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
            hidden: true,
          },
        }),
        variantOptionsCollectionOverride: ({ defaultCollection }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            hidden: true,
          },
        }),
        variantTypesCollectionOverride: ({ defaultCollection }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            hidden: true,
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
  s3Storage({
    enabled: Boolean(S3_BUCKET),
    bucket: S3_BUCKET,
    useCompositePrefixes: true,
    collections: {
      media: {
        prefix: "uploads",
      },
      'chat-media': {
        prefix: "chat-uploads",
      },
    },
    config: {
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    },
  })
]

