# ZiniKart Backend — Production Readiness Audit

- **Date**: 2026-10-29
- **Branch**: `dev`
- **Commit**: `6e4d4128e5397e835497e7aa0d1983a5ca9cea0a`
- **Status**: Review and audit report for production readiness

---

## 🔴 CRITICAL — Must fix before prod

### 1. `.env` contains real secrets committed to source
**File**: [`.env`](file:///e:/Mischief/ecommerce/ecom/.env)

The `.env` file contains **live credentials** that are version-controlled:
- Real Twilio SID/Token (`AC58479f60...`, `c065f904...`)
- Real Razorpay keys (`rzp_test_gmuU...`, `jJj24JWA0F...`)
- **Complete Firebase private key** (full RSA key block)
- Real AWS S3 credentials (`AKIAYIIWP6XU54YLWQOG`, secret key)
- Gemini API key (`AQ.Ab8RN6Lo...`)
- A `PAYLOAD_SECRET` that appears to be the real dev secret

**Action needed**: Rotate ALL credentials, remove `.env` from git history, use AWS Secrets Manager / Parameter Store for prod.

---

### 2. Jobs endpoint publicly accessible (`run: () => true`)
**File**: [`src/payload.config.ts`](file:///e:/Mischief/ecommerce/ecom/src/payload.config.ts#L133-L135)

```ts
jobs: {
  access: {
    run: () => true,   // ← Anyone can trigger any background job
  },
```

Any unauthenticated HTTP request can trigger `processPayouts`, `assignDeliveryPartner`, `processRazorpayRefund`, etc. This is a direct financial / data-integrity risk.

**Action needed**: Gate to `isAdmin` (or internal-only via signed secret).

---

### 3. Razorpay X auto-payout is a stub — but the toggle is live
**File**: [`src/jobs/processPayouts.ts`](file:///e:/Mischief/ecommerce/ecom/src/jobs/processPayouts.ts#L262-L268)

```ts
async function callRazorpayXPayout(...) {
  // TODO: Implement Razorpay X payout logic here.
  throw new Error('Razorpay X not implemented')
}
```

If `payoutMode` is set to `'auto'` in `PlatformSettings`, the hourly cron will try to call this, catch the error, and mark all invoices as `issued` (not `paid`) with an admin note — which is recoverable, but it will silently fail every hour and spam error logs.

**Action needed**: Either implement it or remove the `auto` option from `PlatformSettings` UI until it's ready.

---

### 4. FCM Push Notifications are a no-op stub
**File**: [`src/lib/fcm.ts`](file:///e:/Mischief/ecommerce/ecom/src/lib/fcm.ts)

```ts
export async function sendFcmPush(userId: string, data: any) {
  // TODO: implement FCM logic to push notifications to the user
  console.log(`[FCM Push] ...`)
}
```

Firebase credentials are present in `.env` but the function does nothing. Customers/delivery partners will receive no push notifications in prod.

**Action needed**: Implement using `firebase-admin` SDK before going live, or explicitly document this feature as deferred.

---

### 5. Test OTP bypass is always active
**File**: [`src/plugins/mobileOtpAuth/constants.ts`](file:///e:/Mischief/ecommerce/ecom/src/plugins/mobileOtpAuth/constants.ts)  
**File**: [`src/plugins/mobileOtpAuth/helpers.ts`](file:///e:/Mischief/ecommerce/ecom/src/plugins/mobileOtpAuth/helpers.ts#L51-L61)

```ts
export const OTP_TEST_MOBILE_NUMBER = '+919999999999'
export const OTP_TEST_CODE = '111111'

// AND a range bypass:
const isTestAccount = mobileNumber === OTP_TEST_MOBILE_NUMBER
  || /^\+?(91)?998877\d{4}$/.test(mobileNumber)  // ← any 998877xxxx number
```

Any number matching `+91998877XXXX` can log in with code `111111` with no Twilio verification. This is a backdoor into production user accounts.

The code itself has `// TODO: Remove this test account pattern for prod`.

**Action needed**: Gate `isTestOtp` behind `NODE_ENV !== 'production'` or remove entirely for prod.

---

### 6. Seed endpoint is registered in production
**File**: [`src/payload.config.ts`](file:///e:/Mischief/ecommerce/ecom/src/payload.config.ts#L118-L123) → [`src/endpoints/mobile/index.ts`](file:///e:/Mischief/ecommerce/ecom/src/endpoints/mobile/index.ts)  
**File**: [`src/plugins/index.ts`](file:///e:/Mischief/ecommerce/ecom/src/plugins/index.ts#L305) — `seedPaths` is in OpenAPI spec

The seed endpoint exists at a path registered in OpenAPI docs. Even if it has auth gating inside the handler, its presence in prod is a risk — it deletes all products/categories/brands and re-seeds with demo data.

**Action needed**: Conditionally register the seed endpoint only when `NODE_ENV !== 'production'`.

---

### 7. Dockerfile hardcodes local dev DB URL in build stage
**File**: [`Dockerfile`](file:///e:/Mischief/ecommerce/ecom/Dockerfile#L24)

```dockerfile
ENV DATABASE_URL="postgresql://postgres:madhav@host.docker.internal:5432/postgres"
ENV PAYLOAD_SECRET="dummy_payload_secret_key_for_compilation"
```

These are passed as build-time env vars to allow the Next.js build to compile. While dummy values are used, the `DATABASE_URL` points to your local machine. If Payload ever tries to connect during build (migrations, etc.), it would fail silently or try to reach a non-existent host.

More importantly, any image scanning tool will flag `madhav` and `dummy_payload_secret_key_for_compilation` as leaked credentials.

**Action needed**: Use `ARG` instead of `ENV` for build-time-only values, and use obviously fake/non-connectable values (e.g., `postgresql://dummy:dummy@localhost/dummy`).

---

## 🟠 HIGH — Fix before/soon after launch

### 8. Stripe adapter is configured with `sk_test_mock` fallback
**File**: [`src/constants/env.ts`](file:///e:/Mischief/ecommerce/ecom/src/constants/env.ts#L5-L7)

```ts
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET || 'whsec_mock'
```

If the real env var is missing in prod, Stripe will silently initialize with a mock key — webhook signature validation will fail open or with confusing errors.

**Action needed**: Remove fallbacks. Throw on missing required keys in prod.

---

### 9. WebSocket server has no rate limiting or message size limits
**File**: [`ws-server.ts`](file:///e:/Mischief/ecommerce/ecom/ws-server.ts#L156-L208)

The `handleSend` function validates content length (3000 chars) and attachment count, but:
- No rate limit on messages per second per user
- No limit on `handleMarkRead` call frequency (triggers N DB updates per call)
- No limit on `join_chat` / `leave_chat` frequency
- The `handleMarkRead` N+1 update pattern (line 238-247) in the hot path will hammer the DB under load

**Action needed**: Add per-user rate limiting (e.g., token bucket), and batch-update read receipts.

---

### 10. AI Agent chat route exposes internal source code to authenticated admin users
**File**: [`src/app/api/chat/route.ts`](file:///e:/Mischief/ecommerce/ecom/src/app/api/chat/route.ts)

The agent tools `readSourceFile`, `exploreDirectory`, `searchCode`, and `getPayloadTypes` give the AI (and any admin user who can see its responses) full read access to all `.ts`/`.tsx` files in `src/`. This includes:
- Full access control logic
- Hook implementations
- Endpoint business logic

While limited to `allowedUsers + admins`, this is still a significant information disclosure surface if any admin account is compromised.

**Action needed**: Evaluate whether this feature is needed at launch. At minimum, ensure model names are real (see below).

---

### 11. AI chat route uses non-existent model names
**File**: [`src/app/api/chat/route.ts`](file:///e:/Mischief/ecommerce/ecom/src/app/api/chat/route.ts#L110-L116)

```ts
model = createOpenAI(providerOptions)('gpt-5.6-terra')      // doesn't exist
model = createGoogleGenerativeAI(providerOptions)('gemini-3.5-flash')  // doesn't exist
model = createAnthropic(providerOptions)('claude-sonnet-5')  // doesn't exist
```

These will throw API errors at runtime. The code even has a comment acknowledging this: *"model names are moving fast and this table will go stale"*.

**Action needed**: Update to current valid model IDs before launch.

---

### 12. `allowedDevOrigins` left in `next.config.ts`
**File**: [`next.config.ts`](file:///e:/Mischief/ecommerce/ecom/next.config.ts#L51)

```ts
allowedDevOrigins: ['zinikart.com'],
```

`allowedDevOrigins` is a Next.js dev-only config to allow cross-origin requests during development. In production, it has no effect — but it signals that CORS/origin handling hasn't been formally configured yet. The real CORS policy for the API/WS server should be explicitly set.

---

### 13. WS server `start:chat` uses `tsx` in production
**File**: [`package.json`](file:///e:/Mischief/ecommerce/ecom/package.json#L10)

```json
"start:chat": "cross-env NODE_ENV=production tsx ws-server.ts"
```

`tsx` is a TypeScript runner intended for development. Running raw `.ts` files in production adds startup overhead, is not as optimized as compiled JS, and `tsx` is in `devDependencies`.

**Action needed**: Compile `ws-server.ts` to JS as part of the build and run the compiled output in production. Or use `ts-node` with `--transpile-only` if you must keep `.ts` at runtime.

---

### 14. `EXPERIMENTAL_TableFeature` used in rich text editor
**File**: [`src/payload.config.ts`](file:///e:/Mischief/ecommerce/ecom/src/payload.config.ts#L4)

```ts
EXPERIMENTAL_TableFeature,
```

Prefixed `EXPERIMENTAL_` by the Payload team — may have breaking changes or be removed. Minor risk for a backend CMS, but worth noting for stability.

---

## 🟡 MEDIUM — Clean up / best practice

### 15. `console.log` in production code paths
Several files have `console.log` left in:
- [`src/lib/fcm.ts`](file:///e:/Mischief/ecommerce/ecom/src/lib/fcm.ts) — in the hot path of every chat message
- [`src/components/forms/FindOrderForm/sendOrderAccessEmail.ts`](file:///e:/Mischief/ecommerce/ecom/src/components/forms/FindOrderForm/sendOrderAccessEmail.ts#L51) — logs full email body
- [`src/app/api/chat/route.ts`](file:///e:/Mischief/ecommerce/ecom/src/app/api/chat/route.ts#L137) — logs AI token usage (acceptable but should use `payload.logger`)

**Action needed**: Replace with `payload.logger` or remove.

---

### 16. Email adapter is commented out
**File**: [`src/payload.config.ts`](file:///e:/Mischief/ecommerce/ecom/src/payload.config.ts#L117)

```ts
//email: nodemailerAdapter(),
```

No email adapter is configured. Payload's built-in password reset, magic link, and any `payload.sendEmail()` calls will silently fail.

**Action needed**: Configure nodemailer with SMTP/SES credentials for prod.

---

### 17. PlatformSettings Razorpay X secrets stored in the database
**File**: [`src/globals/PlatformSettings.ts`](file:///e:/Mischief/ecommerce/ecom/src/globals/PlatformSettings.ts#L143-L153)

Razorpay X API key ID and key secret are stored as plain text fields in the `platform-settings` global (DB). This means they're readable by anyone with DB access or admin access to the settings global.

**Action needed**: Store these in environment variables / AWS Secrets Manager instead.

---

### 18. Order status update endpoint allows any role to set arbitrary status
**File**: [`src/endpoints/orders/statusUpdate.ts`](file:///e:/Mischief/ecommerce/ecom/src/endpoints/orders/statusUpdate.ts#L52-L66)

The `statusUpdateEndpoint` does role-checking but then calls `payload.update` with whatever `status` string the client sends — there's no allowlist of valid status transitions per role. A retailer could set `status: 'delivered'` or a delivery partner could set `status: 'cancelled'`.

The `validateSingleVendor` and `handoverOtpValidation` hooks provide some protection, but the status machine itself is not enforced at the endpoint level.

---

### 19. `WS_INTERNAL_SECRET` still uses dev default in .env.example
**File**: [`.env.example`](file:///e:/Mischief/ecommerce/ecom/.env.example#L30)

```
WS_INTERNAL_SECRET=dev-ws-internal-secret-change-in-prod
```

The comment says "change-in-prod" but this is an easy-to-miss config. If the env var isn't overridden, the internal `/internal/broadcast` and `/internal/online` endpoints are protected by a known public default secret.

---

### 20. `MOBILE_API_KEY` in `.env` not referenced in code
**File**: [`.env`](file:///e:/Mischief/ecommerce/ecom/.env#L29)

```
MOBILE_API_KEY=47a0b342520797536507e01ee93a3243183d0304
```

This variable exists in `.env` but doesn't appear in `src/constants/env.ts` or anywhere in the codebase. May be dead code, or may have been removed from usage but left in env. Either way, it's a credential that needs rotation.

---

### 21. Bank account numbers stored in plaintext
**Files**: [`src/collections/Retailers/index.ts`](file:///e:/Mischief/ecommerce/ecom/src/collections/Retailers/index.ts#L184), [`src/collections/DeliveryPartners/index.ts`](file:///e:/Mischief/ecommerce/ecom/src/collections/DeliveryPartners/index.ts#L167)

Full bank account numbers and IFSC codes are stored as plain `text` fields in `paymentMethods`. PCI DSS and Indian RBI guidelines require masking/encrypting payment account data at rest.

The `processPayouts.ts` job partially masks on output (`****${slice(-4)}`), but the full number is stored and readable.

---

### 22. Missing `req` in some WS server mark-read Payload updates
**File**: [`ws-server.ts`](file:///e:/Mischief/ecommerce/ecom/ws-server.ts#L241-L247)

```ts
await payload.update({
  collection: 'chat-messages',
  id: msg.id,
  data: { readBy: [...readBy, { user: user.id, readAt: new Date().toISOString() }] },
  // No req — runs in separate transaction from the find above
})
```

Operations in the WS server that call `payload.update` without a `req` object run outside any shared transaction context. Since the WS server is a separate Node process, there's no `req` to thread — but each update runs in isolation with no rollback guarantee. This is a known architectural constraint, but worth noting.

---

## 📋 Summary by Priority

| # | Severity | Issue |
|---|----------|-------|
| 1 | 🔴 Critical | Real secrets committed to `.env` |
| 2 | 🔴 Critical | Jobs endpoint is publicly accessible |
| 3 | 🔴 Critical | Razorpay X auto-payout is a stub |
| 4 | 🔴 Critical | FCM push is a no-op stub |
| 5 | 🔴 Critical | Test OTP bypass active in all environments |
| 6 | 🔴 Critical | Seed endpoint registered in production |
| 7 | 🔴 Critical | Dockerfile leaks local DB credentials |
| 8 | 🟠 High | Stripe mock fallback keys |
| 9 | 🟠 High | WS server has no rate limiting |
| 10 | 🟠 High | AI agent exposes source code internally |
| 11 | 🟠 High | AI chat uses non-existent model names |
| 12 | 🟠 High | `allowedDevOrigins` left in next.config |
| 13 | 🟠 High | WS server runs `tsx` in production |
| 14 | 🟠 High | `EXPERIMENTAL_TableFeature` in use |
| 15 | 🟡 Medium | `console.log` in production code paths |
| 16 | 🟡 Medium | Email adapter commented out |
| 17 | 🟡 Medium | Razorpay X secrets stored in DB |
| 18 | 🟡 Medium | No status transition allowlist per role |
| 19 | 🟡 Medium | Default WS internal secret in example |
| 20 | 🟡 Medium | `MOBILE_API_KEY` orphan credential |
| 21 | 🟡 Medium | Bank account numbers stored in plaintext |
| 22 | 🟡 Medium | No transaction context in WS server updates |
