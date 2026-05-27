---
name: payload-ecommerce
description: "Use when working with @payloadcms/plugin-ecommerce or the official Payload ecommerce template: configuring ecommercePlugin, products, variants, carts, orders, transactions, addresses, currencies, inventory, payments, Stripe, frontend EcommerceProvider/hooks, cart endpoints, payment adapters, or debugging Payload ecommerce behavior in this repo."
---

# Payload Ecommerce

Use this skill alongside the general Payload skill when the task touches the Payload Ecommerce Plugin or this ecommerce template.

## Workflow

1. Read the local implementation first:
   - `src/plugins/index.ts` for `ecommercePlugin` and payment adapter config.
   - `src/collections/Products/index.ts` for product overrides.
   - `src/providers/index.tsx` for `EcommerceProvider`.
   - Cart, checkout, account, order, and product UI under `src/components/` and `src/app/(app)/`.
2. Load `references/ecommerce-plugin.md` when you need plugin-specific docs, option names, frontend hook behavior, endpoint paths, or payment adapter details.
3. Preserve Payload ecommerce conventions:
   - Ecommerce collection API routes are under `/api`.
   - Payment endpoints are `/api/payments/{provider}/{action}`.
   - Stripe webhooks forward to `/api/payments/stripe/webhooks`.
   - Cart collection endpoints include `/api/carts/:cartID/add-item`, `update-item`, `remove-item`, and `clear`.
4. When using Local API on behalf of a user, pass `overrideAccess: false`.
5. When writing hooks or adapter operations that perform nested Payload writes, pass `req` through the nested operations to preserve transactions.

## Important Defaults

- The ecommerce plugin is beta and may have breaking changes.
- Customers are configured by collection slug, usually `users`.
- Products, variants, carts, orders, transactions, addresses, and payments are supplied or extended by the plugin.
- Products and variants store prices as integer amounts by currency-specific fields such as `priceInUSD`.
- Inventory is enabled by default and is decremented when orders are placed.
- Guest carts are enabled by default and use local storage plus a cart secret.
- Shipping, taxes, and subscriptions are not built in; implement them with collection overrides, hooks, custom fields, or custom payment/checkout logic.

## Common Tasks

- **Add fields to plugin collections**: use the relevant `*CollectionOverride` and spread or map `defaultCollection.fields`.
- **Customize product schema**: use `products.productsCollectionOverride` and `products.variants.*CollectionOverride`.
- **Customize cart item uniqueness**: use `carts.cartItemMatcher`; extend `defaultCartItemMatcher` when possible.
- **Add payment providers**: implement the payment adapter interface or use `stripeAdapter`.
- **Frontend cart/checkout work**: use `EcommerceProvider`, `useCart`, `useAddresses`, `usePayments`, `useCurrency`, `useEcommerceConfig`, or `useEcommerce`.
- **Stripe local webhooks**: use `stripe listen --forward-to localhost:3000/api/payments/stripe/webhooks`.

## Reference

Read `references/ecommerce-plugin.md` for the saved Payload ecommerce docs supplied by the user, including:

- Plugin options and access functions
- Products, variants, currencies, inventory
- Carts, cart endpoints, cart matcher, server-side cart operations
- Orders, transactions, addresses
- EcommerceProvider and frontend React hooks
- Stripe adapter, webhooks, and custom payment adapters
