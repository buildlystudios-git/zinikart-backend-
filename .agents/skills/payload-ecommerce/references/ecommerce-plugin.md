# Payload Ecommerce Plugin Reference

Saved from user-provided Payload CMS ecommerce template/plugin docs.

## Table Of Contents

- Overview
- Basic plugin usage
- Concepts and collection relationships
- Plugin options
- Access functions
- Addresses
- Carts
- Customers
- Currencies
- Inventory
- Payments and Stripe
- Products and variants
- Product validation
- Orders and transactions
- Translations
- Frontend provider and hooks
- Payment adapters
- Best practices

## Overview

Package: `@payloadcms/plugin-ecommerce`

The Payload Ecommerce Plugin adds ecommerce functionality to a Payload app. It is currently beta and may introduce breaking changes in future releases.

Core features:

- Products with variants
- Database-backed carts
- Orders and transactions
- Customer-linked addresses
- Payment adapter pattern
- Stripe support
- Multiple currencies
- React frontend utilities

The plugin does not natively handle shipping, taxes, or subscriptions. Implement those through custom fields, collection overrides, hooks, custom endpoints, or payment/checkout logic.

## Basic Plugin Usage

```ts
import { buildConfig } from 'payload'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'

export default buildConfig({
  collections: [
    {
      slug: 'pages',
      fields: [],
    },
  ],
  plugins: [
    ecommercePlugin({
      access: {
        adminOnlyFieldAccess,
        adminOrPublishedStatus,
        isAdmin,
        isAuthenticated,
        isCustomer,
        isDocumentOwner,
      },
      customers: { slug: 'users' },
    }),
  ],
})
```

Typical Stripe usage:

```ts
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'

ecommercePlugin({
  access: {
    adminOnlyFieldAccess,
    adminOrPublishedStatus,
    isAdmin,
    isAuthenticated,
    isCustomer,
    isDocumentOwner,
  },
  customers: {
    slug: 'users',
  },
  payments: {
    paymentMethods: [
      stripeAdapter({
        secretKey: process.env.STRIPE_SECRET_KEY!,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
      }),
    ],
  },
  products: {
    productsCollectionOverride: ProductsCollection,
  },
})
```

Types can be imported from `@payloadcms/plugin-ecommerce/types`:

- `Cart`
- `CollectionOverride`
- `CurrenciesConfig`
- `EcommercePluginConfig`
- `FieldsOverride`

## Concepts

### Customers

Customers can be any auth/user collection. The configured customer slug links customers to carts, orders, and addresses. Access control can distinguish admins, customers, authenticated users, guests, and document owners.

### Products And Variants

Products are sellable items. Products have prices and may have variants through join fields and allowed variant types.

Variant model:

- `variantTypes`: dimensions such as Size or Color.
- `variantOptions`: options for each type, such as Small, Medium, Large.
- `variants`: actual purchasable combinations, such as T-Shirt / Small / Red.

### Carts

Carts are linked to customers or left public for guest users. Carts contain products and optional variants. Authenticated customers get carts automatically when adding their first item. Guest cart IDs and secrets are stored client-side.

### Transactions And Orders

Transactions are created when payment is initiated. They track payment status and are linked to cart/customer data. Orders are created when a transaction succeeds and contain final purchase details.

### Addresses

Addresses are linked to customers and can be reused for billing or shipping.

### Payments

Payment gateways use adapters. Stripe is the default supported adapter. Custom adapters implement the payment adapter interface.

### Currencies

Supported currencies are configured at plugin level. Each currency creates price fields on product and variant collections, such as `priceInUSD`.

## Plugin Options

Top-level options:

- `access`: required access functions for collection and field permissions.
- `addresses`: address collection settings and overrides.
- `carts`: cart collection settings, guest carts, and matching behavior.
- `currencies`: supported currencies and default currency.
- `customers`: required customer collection slug.
- `inventory`: boolean or object, defaults to enabled.
- `payments`: payment methods and adapters.
- `products`: products, variants, and validation settings.
- `orders`: order collection override.
- `transactions`: transaction collection override or disabling.

Override fields usually receive default fields and return an updated field array. Collection overrides receive `defaultCollection`.

## Access

The plugin requires access control functions in `access`.

Expected functions:

- `adminOnlyFieldAccess`: field access for admin users.
- `adminOrPublishedStatus`: access if admin or document has `_status: published`.
- `isAdmin`: collection access for admins.
- `isAuthenticated`: any logged-in user.
- `isCustomer`: optional field access for authenticated non-admin customers.
- `isDocumentOwner`: access if user owns the document via `customer`.
- `publicAccess`: optional, defaults to `() => true`.
- `customerOnlyFieldAccess`: deprecated; use `isCustomer`.

Examples:

```ts
adminOnlyFieldAccess: ({ req: { user } }) =>
  Boolean(user?.roles?.includes('admin'))

adminOrPublishedStatus: ({ req: { user } }) => {
  if (user?.roles?.includes('admin')) return true
  return { _status: { equals: 'published' } }
}

isAdmin: ({ req: { user } }) => Boolean(user?.roles?.includes('admin'))

isAuthenticated: ({ req: { user } }) => Boolean(user)

isCustomer: ({ req: { user } }) =>
  Boolean(user && !user?.roles?.includes('admin'))

isDocumentOwner: ({ req: { user } }) => {
  if (user?.roles?.includes('admin')) return true
  if (user?.id) return { customer: { equals: user.id } }
  return false
}
```

## Addresses

`addresses` defaults to `true`, creating the default addresses collection.

Options:

- `addressFields`: fields override function.
- `addressesCollectionOverride`: override default address collection.
- `supportedCountries`: ISO 3166-1 alpha-2 country codes. Defaults to all.

Example:

```ts
addresses: {
  addressesCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'googleMapLocation',
        label: 'Google Map Location',
        type: 'text',
      },
    ],
  }),
}
```

Default countries can be imported from:

```ts
import { defaultCountries } from '@payloadcms/plugin-ecommerce/client/react'
```

## Carts

`carts` defaults to `true`, creating the carts collection and enabling guest carts.

Options:

- `allowGuestCarts`: defaults to `true`.
- `cartsCollectionOverride`: override carts collection.
- `cartItemMatcher`: custom item uniqueness function.

Example field override:

```ts
carts: {
  cartsCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
      },
    ],
  }),
}
```

Disable guest carts:

```ts
carts: {
  allowGuestCarts: false,
}
```

### Cart API Endpoints

The plugin adds endpoints to the carts collection.

Add item:

```txt
POST /api/carts/:cartID/add-item
```

Body:

- `item`: `{ product: string, variant?: string }`
- `quantity`: number, defaults to 1
- `secret`: guest cart secret when applicable

Update item:

```txt
POST /api/carts/:cartID/update-item
```

Body:

- `itemID`: cart item row ID
- `quantity`: number or `{ $inc: number }`
- `removeOnZero`: defaults to true
- `secret`: guest cart secret when applicable

Remove item:

```txt
POST /api/carts/:cartID/remove-item
```

Body:

- `itemID`
- `secret`

Clear cart:

```txt
POST /api/carts/:cartID/clear
```

Body:

- `secret`

### Cart Item Matcher

The matcher decides when a new item should merge with an existing item. Default matching uses product and variant IDs.

Use a custom matcher when identical products should remain separate by additional criteria such as fulfillment, gift wrap, personalization, or subscription interval.

```ts
import type { CartItemMatcher } from '@payloadcms/plugin-ecommerce'

const fulfillmentCartItemMatcher: CartItemMatcher = ({
  existingItem,
  newItem,
}) => {
  const existingProductID =
    typeof existingItem.product === 'object'
      ? existingItem.product.id
      : existingItem.product

  const existingVariantID =
    existingItem.variant && typeof existingItem.variant === 'object'
      ? existingItem.variant.id
      : existingItem.variant

  const productMatches = existingProductID === newItem.product
  const variantMatches = newItem.variant
    ? existingVariantID === newItem.variant
    : !existingVariantID

  return (
    productMatches &&
    variantMatches &&
    existingItem.fulfillment === newItem.fulfillment
  )
}
```

Extend the default matcher:

```ts
import {
  defaultCartItemMatcher,
  type CartItemMatcher,
} from '@payloadcms/plugin-ecommerce'

const customMatcher: CartItemMatcher = (args) => {
  return (
    defaultCartItemMatcher(args) &&
    args.existingItem.giftWrap === args.newItem.giftWrap
  )
}
```

### Server-Side Cart Operations

Import isolated operations:

```ts
import {
  addItem,
  removeItem,
  updateItem,
  clearCart,
} from '@payloadcms/plugin-ecommerce'
```

Examples:

```ts
await addItem({
  payload,
  cartsSlug: 'carts',
  cartID: '123',
  item: { product: 'prod-1', variant: 'var-1' },
  quantity: 2,
})

await updateItem({
  payload,
  cartsSlug: 'carts',
  cartID: '123',
  itemID: 'item-row-id',
  quantity: { $inc: 1 },
})

await removeItem({
  payload,
  cartsSlug: 'carts',
  cartID: '123',
  itemID: 'item-row-id',
})

await clearCart({
  payload,
  cartsSlug: 'carts',
  cartID: '123',
})
```

## Customers

`customers.slug` is required and identifies the customer collection. Usually this is `users`.

## Currencies

`currencies` defaults to USD.

Options:

- `supportedCurrencies`: array of currency objects.
- `defaultCurrency`: currency code from `supportedCurrencies`.

Currency shape:

```ts
type Currency = {
  code: string
  decimals: number
  label: string
  symbol: string
}
```

Built-in currencies:

- `USD`
- `EUR`
- `GBP`

Example:

```ts
import { USD } from '@payloadcms/plugin-ecommerce'

ecommercePlugin({
  currencies: {
    supportedCurrencies: [
      USD,
      {
        code: 'JPY',
        decimals: 0,
        label: 'Japanese Yen',
        symbol: '¥',
      },
    ],
    defaultCurrency: 'USD',
  },
})
```

Adding currencies may require schema migrations because it adds price fields. Payment gateway dashboards must also enable the currencies.

## Inventory

`inventory` defaults to `true`.

Options:

- `fieldName`: override inventory field name, defaults to `inventory`.

Inventory tracking is basic. The plugin adds inventory fields and decrements inventory when an order is placed.

## Payments

`payments.paymentMethods` is an array of adapters.

Payment adapter base args:

- `label`
- `groupOverrides`

Client adapter base args:

- `label`

Payment fields are stored on transactions.

### Stripe Adapter

Install Stripe separately:

```bash
pnpm add stripe
```

Recommended version: at least `18.5.0`.

Server adapter:

```ts
import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'

stripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
})
```

Options:

- `secretKey`
- `publishableKey`
- `webhookSecret`
- `webhooks`
- `apiVersion`
- `appInfo`
- `groupOverrides`

Webhook example:

```ts
stripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
  webhooks: {
    'payment_intent.succeeded': ({ event, req, stripe }) => {
      req.payload.logger.info('Payment succeeded')
    },
  },
})
```

Local Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payments/stripe/webhooks
stripe trigger payment_intent.succeeded
```

Copy the generated `whsec_...` value exactly into `STRIPE_WEBHOOKS_SIGNING_SECRET`, then restart the dev server.

Client adapter:

```tsx
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { stripeAdapterClient } from '@payloadcms/plugin-ecommerce/payments/stripe'

<EcommerceProvider
  paymentMethods={[
    stripeAdapterClient({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    }),
  ]}
>
  {children}
</EcommerceProvider>
```

Never expose `secretKey` or `webhookSecret` to the client.

## Products

`products` defaults to enabled and creates product and variant collections.

Options:

- `productsCollectionOverride`
- `variants`
- `validation`

Product override:

```ts
products: {
  productsCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
      },
    ],
  }),
}
```

### Variants

Variant options:

- `variantsCollectionOverride`
- `variantTypesCollectionOverride`
- `variantOptionsCollectionOverride`

Example:

```ts
variants: {
  variantsCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'customField',
        label: 'Custom Field',
        type: 'text',
      },
    ],
  }),
}
```

## Product Validation

Product validation runs when creating transactions or confirming payments. It protects against deleted products, missing prices, or out-of-stock purchases.

Arguments:

- `currenciesConfig`
- `product`
- `variant`
- `quantity`
- `currency`

The function should throw for invalid purchases.

Default validation checks:

- Currency exists.
- Product or variant has a price in the selected currency.
- Product or variant has sufficient inventory.

## Orders

`orders` defaults to enabled.

Option:

- `ordersCollectionOverride`

```ts
orders: {
  ordersCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
      },
    ],
  }),
}
```

## Transactions

`transactions` defaults to enabled.

Option:

- `transactionsCollectionOverride`

```ts
transactions: {
  transactionsCollectionOverride: ({ defaultCollection }) => ({
    ...defaultCollection,
    fields: [
      ...defaultCollection.fields,
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
      },
    ],
  }),
}
```

## Translations

Admin UI translations live under the `plugin-ecommerce` namespace.

```ts
import { en } from '@payloadcms/translations/languages/en'
import { enTranslations as ecommerceEn } from '@payloadcms/plugin-ecommerce/translations/languages/en'

export default buildConfig({
  i18n: {
    supportedLanguages: { en },
    translations: {
      en: ecommerceEn,
    },
  },
})
```

Override specific strings:

```ts
i18n: {
  supportedLanguages: { en },
  translations: {
    en: {
      ...ecommerceEn,
      'plugin-ecommerce': {
        ...ecommerceEn['plugin-ecommerce'],
        cart: 'Shopping Cart',
        orders: 'My Orders',
      },
    },
  },
}
```

## Frontend

Available frontend utilities:

- `EcommerceProvider`
- `useCart`
- `useAddresses`
- `usePayments`
- `useCurrency`
- `useEcommerceConfig`
- `useEcommerce`

### EcommerceProvider

Props:

- `addressesSlug`: defaults to `addresses`.
- `api`: API config.
- `cartsSlug`: defaults to `carts`.
- `children`
- `currenciesConfig`
- `customersSlug`: defaults to `users`.
- `debug`
- `enableVariants`: defaults to `true`.
- `paymentMethods`
- `syncLocalStorage`: defaults to `true`.

Example:

```tsx
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { USD, EUR } from '@payloadcms/plugin-ecommerce'

<EcommerceProvider
  enableVariants={true}
  currenciesConfig={{
    supportedCurrencies: [USD, EUR],
    defaultCurrency: 'USD',
  }}
>
  {children}
</EcommerceProvider>
```

`api` options:

- `apiRoute`: defaults to `/api`.
- `serverURL`
- `cartsFetchQuery`

`cartsFetchQuery` supports:

- `depth`
- `select`
- `populate`

`syncLocalStorage` object supports:

- `key`: defaults to `cart`.

### useCart

Returns:

- `addItem(item, quantity?)`
- `cart`
- `clearCart()`
- `decrementItem(itemID)`
- `incrementItem(itemID)`
- `isLoading`
- `removeItem(itemID)`

### useAddresses

Returns:

- `addresses`
- `createAddress(data)`
- `isLoading`
- `updateAddress(addressID, data)`

### usePayments

Returns:

- `confirmOrder(args)`
- `initiatePayment(args)`
- `isLoading`
- `paymentMethods`
- `selectedPaymentMethod`

Typical Stripe flow:

1. `initiatePayment('stripe', { additionalData })` creates a processing transaction and returns payment data such as `client_secret`.
2. Confirm payment client-side with Stripe.js.
3. `confirmOrder('stripe', { additionalData })` marks transaction complete and creates the order.

`initiatePayment` hits:

```txt
/api/payments/stripe/initiate
```

`confirmOrder` hits:

```txt
/api/payments/stripe/confirm-order
```

### useCurrency

Returns:

- `currenciesConfig`
- `currency`
- `formatPrice(amount)`
- `setCurrency(currencyCode)`

Prices are stored as integers to avoid decimal issues. Use `formatPrice` for display.

### useEcommerceConfig

Returns:

- `addressesSlug`
- `cartsSlug`
- `customersSlug`
- `api.apiRoute`

Use it to build custom URLs with configured slugs.

### useEcommerce

Combines ecommerce hooks and config:

- `cart`
- `addresses`
- `clearSession`
- `config`
- `isLoading`
- `selectedPaymentMethod`
- `onLogin`
- `onLogout`
- `mergeCart`
- `refreshCart`

## Session Management

### onLogin

Call after successful login. It:

- Fetches authenticated user data.
- Merges guest cart into existing user cart when both exist.
- Transfers guest cart to user when no user cart exists.
- Clears guest cart secrets.

### onLogout / clearSession

Call during logout to clear ecommerce state and local storage:

- Cart data and cart ID
- Cart secret
- User addresses
- User state

### mergeCart

Merges a source cart into a target cart:

- Matching items combine quantities.
- Non-matching items are added.
- Source cart is deleted after successful merge.

Args:

- `targetCartID`
- `sourceCartID`
- `sourceSecret`

### refreshCart

Fetches latest cart data from the server and updates local state.

## Payment Adapter Pattern

REST endpoints are created per payment adapter:

```txt
POST /api/payments/{provider_name}/initiate
POST /api/payments/{provider_name}/confirm-order
```

Server adapter interface includes:

- `name`
- `label`
- `initiatePayment`
- `confirmOrder`
- `endpoints`
- `group`

Adapter args include:

- `label`
- `groupOverrides`

`initiatePayment` receives:

- `transactionsSlug`
- `data`
- `customersSlug`
- `req`

`data` can include:

- `billingAddress`
- `shippingAddress`
- `cart`
- `customerEmail`
- `currency`

Return at least:

- `message`

`confirmOrder` receives:

- `ordersSlug`
- `transactionsSlug`
- `cartsSlug`
- `customersSlug`
- `data`
- `req`

Return at least:

- `message`
- `orderID`
- `transactionID`

Payment adapter transaction group example:

```ts
const groupField = {
  name: 'stripe',
  type: 'group',
  admin: {
    condition: (data) => data?.paymentMethod === 'stripe',
  },
  fields: [
    {
      name: 'customerID',
      type: 'text',
      label: 'Stripe Customer ID',
    },
    {
      name: 'paymentIntentID',
      type: 'text',
      label: 'Stripe PaymentIntent ID',
    },
  ],
}
```

Client adapter interface includes:

- `name`
- `label`
- `initiatePayment`: boolean
- `confirmOrder`: boolean

## Best Practices

- Keep sensitive payment operations server-side.
- Never expose Stripe secret keys or webhook secrets to the browser.
- Use `NEXT_PUBLIC_` only for public keys.
- Verify Stripe webhook signatures.
- Use server-side product and price validation. Never trust prices from the client.
- It is safe to pass transaction IDs to the frontend, but do not pass sensitive transaction data.
- Use webhooks for provider-originated state changes when needed.
- For Payload Local API operations that act on behalf of a user, pass `overrideAccess: false`.
- In hooks and adapter internals, pass `req` through nested writes to preserve transaction behavior.
