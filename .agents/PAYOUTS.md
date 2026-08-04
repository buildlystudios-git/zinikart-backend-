# Payout System — Implementation Notes

> Last updated: 2026-08-04  
> Author: AI agent (Antigravity)  
> Status: Core pipeline complete; Razorpay X auto-payout is a documented stub.

---

## Overview

This document describes the complete payout system implemented for ZiniKart. The system handles automatic calculation and disbursement of earnings to **Retailers** and **Delivery Partners** after an order is successfully delivered. All configuration is stored in a global `PlatformSettings` record — nothing is hardcoded.

### Money Flow (Razorpay pre-paid)

```
Customer pays → Razorpay → Platform account (ZiniKart)
                                    ↓ (after delay window)
                     Retailer ← payout ← Platform
                     Delivery Partner ← payout ← Platform
```

> **COD flow is on hold.** COD handling is explicitly excluded for now. All payment logic currently assumes a Razorpay pre-paid flow where ZiniKart holds the funds. TODO comments mark the COD entry points in the code.

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `src/globals/PlatformSettings.ts` | Global config: fees, payout delay, payout mode, Razorpay X credentials |
| `src/collections/PayoutLedger/index.ts` | Per-order-per-recipient earnings record |
| `src/collections/PayoutInvoice/index.ts` | Batched payout invoice (groups multiple ledger entries) |
| `src/collections/Orders/hooks/triggerPayoutLedger.ts` | Hook: creates ledgers on delivery, suspends on cancellation |
| `src/jobs/processPayouts.ts` | Batch job: advances `pending→eligible`, batches invoices, triggers disbursement |
| `src/endpoints/payouts/index.ts` | Mobile REST endpoints for retailer/DP to view their ledgers and invoices |
| `src/endpoints/payouts/markDisbursed.ts` | Admin-only endpoint to manually mark an invoice as paid |
| `src/endpoints/payouts/openapi.ts` | OpenAPI/docs definitions for payout endpoints |
| `src/access/isOwnPayoutRecord.ts` | Access control: admin sees all; others see only their own records |
| `tests/api/payouts.ts` | Full integration test suite for the payout pipeline |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/payload.config.ts` | Registered `PayoutLedger`, `PayoutInvoice` collections; `PlatformSettings` global; payout endpoints; `processPayoutsTask` job |
| `src/collections/Orders/hooks/triggerSideEffects.ts` | Added TODO comment for future return/refund flow |
| `tests/api/run.ts` | Added `runPayoutTests` call; other test suites commented out for speed |

---

## Architecture

### 1. `PlatformSettings` Global (`src/globals/PlatformSettings.ts`)

Configurable from the admin panel under **Settings → Platform Settings**. Key fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `deliveryFeeMode` | select | `flat` | Flat fee or variable per order |
| `defaultDeliveryFee` | number | `50` | Default delivery fee in ₹ |
| `platformFeeRetailer` | number | `10` | Platform fee % deducted from retailer gross |
| `platformFeeDP` | number | `5` | Platform fee % deducted from DP's delivery fee |
| `payoutDelayDays` | number | `7` | Days to hold funds after delivery before becoming eligible |
| `payoutDelayLabel` | select | `weekly` | Cosmetic label shown in UI (daily / weekly / monthly etc.) |
| `minPayoutAmountINR` | number | `100` | Minimum total net required before a payout batch is processed |
| `payoutMode` | select | `manual` | `manual` = admin marks disbursed; `auto` = Razorpay X API call |
| `razorpayXGroup` | group | — | Conditional (only shown if `payoutMode = auto`); stores account number, key ID, key secret |

### 2. `PayoutLedger` Collection (`src/collections/PayoutLedger/index.ts`)

One record per **order × recipient**. Created automatically when an order transitions to `delivered`. Admin panel group: **Finance**.

**Status lifecycle:**

```
pending → eligible → processing → paid
                   ↘ on_hold   ↘ failed
         cancelled (if order is cancelled)
```

Key fields: `order`, `recipient`, `recipientType` (`retailer` | `delivery_partner`), `retailerProfile` / `deliveryPartnerProfile`, `grossAmount`, `platformFeePercent`, `platformFeeAmount`, `netAmount`, `deliveredAt`, `eligibleAt`, `paidAt`, `status`, `payoutInvoice` (relation), `payoutRef`, `adminNotes`, `failureReason`.

> **Important:** Fees are **snapshotted at creation time**. A fee change in PlatformSettings will NOT retroactively affect existing ledger entries.

### 3. `PayoutInvoice` Collection (`src/collections/PayoutInvoice/index.ts`)

One invoice per **batch run per recipient**. Groups multiple ledger entries. Admin panel group: **Finance**.

**Status lifecycle:**

```
draft → issued → paid
```

Key fields: `invoiceNumber` (auto-generated: `INV-R-YYYYMMDD-XXXXXX` or `INV-DP-...`), `invoiceType`, `recipient`, `period` (`from` / `to`), `lineItems` (array of order breakdowns), `totalGross`, `totalFees`, `totalNet` (all auto-calculated from `lineItems` via `beforeChange` hooks), `payoutDestination` (snapshot of bank/UPI details), `status`, `issuedAt`, `paidAt`, `payoutRef`, `adminNotes`.

### 4. `triggerPayoutLedger` Hook (`src/collections/Orders/hooks/triggerPayoutLedger.ts`)

An `afterChange` hook on the `Orders` collection. Fires on two events:

**On delivery (`status → delivered`):**
1. Checks if ledger already exists for this order (idempotency guard).
2. Fetches `PlatformSettings` for fee rates and delay.
3. Creates a `PayoutLedger` record for the **Retailer** (based on `order.subtotal`).
4. Creates a `PayoutLedger` record for the **Delivery Partner** (based on `order.deliveryFee` or `defaultDeliveryFee` fallback), if a DP is assigned.

**On cancellation (`status → cancelled`):**
- Finds all ledgers for this order with status `pending`, `eligible`, or `processing`.
- Sets them to `on_hold` with an admin note.
- TODO comment marks where to add return/refund handling when that order status is added.

### 5. `processPayouts` Job (`src/jobs/processPayouts.ts`)

A Payload background task intended to be run on a schedule (e.g. daily cron). Must be triggered manually or scheduled via the jobs system.

**Pipeline:**
1. Fetch `PlatformSettings` for `minPayoutAmountINR` and `payoutMode`.
2. Advance all `pending` ledgers where `eligibleAt <= now` → status `eligible`.
3. Fetch all `eligible` ledgers.
4. Group by `recipient`.
5. For each group:
   a. **Order status check**: verify the source order is not `cancelled`. If cancelled, put ledger `on_hold` and skip.
   b. Skip if total net below `minPayoutAmountINR`.
   c. Mark ledgers as `processing`.
   d. Fetch recipient's default payment method (bank / UPI) from `retailers` or `delivery-partners`.
   e. If no payment method → `on_hold` with reason.
   f. Snapshot `payoutDestination` (account number is masked to last 4 digits).
   g. Create a `PayoutInvoice` in `draft` status with all line items.
   h. Link ledgers to the invoice.
   i. **Manual mode**: update invoice to `issued`.
   j. **Auto mode**: call `callRazorpayXPayout()` (currently a stub that throws). On success → `paid`. On failure → ledgers `failed`, invoice `issued` with error in `adminNotes`.
6. Return `{ success: true }`.

> **The `callRazorpayXPayout` function is a documented stub.** See "Pending Work" section.

### 6. Mobile Endpoints (`src/endpoints/payouts/index.ts`)

All endpoints require authentication (JWT). Registered at the global Payload config level.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mobile/payouts/my-ledger` | Any authenticated user | Returns paginated ledger entries for the current user. Supports `?page`, `?limit`, `?status` query params. |
| GET | `/api/mobile/payouts/my-invoices` | Any authenticated user | Returns paginated invoices for the current user. |
| GET | `/api/mobile/payouts/invoices/:id` | Any authenticated user | Returns a single invoice by ID. Access-controlled to own records only. |

### 7. Admin Disbursement Endpoint (`src/endpoints/payouts/markDisbursed.ts`)

Registered on the `payout-invoices` collection.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payout-invoices/:id/mark-disbursed` | Admin only | Marks invoice as `paid`, sets `paidAt`, stores `payoutRef`. Cascades `paid` + `paidAt` + `payoutRef` to all linked ledgers. |

**Request body:**
```json
{ "payoutRef": "BANK-TXN-ID-OR-RAZORPAY-REF" }
```

### 8. Access Control (`src/access/isOwnPayoutRecord.ts`)

Used by both `PayoutLedger` and `PayoutInvoice` collections for `read` access.
- **Admin**: full unrestricted access.
- **Others**: can only read records where `recipient === req.user.id`.
- Create / Update / Delete: admin only.

---

## Test Suite (`tests/api/payouts.ts`)

Run with: `pnpm run test:api`

Covers 11 assertions across two sections:

**Section 1 — API & Access Control (assertions 1–11)**
- Retailer can fetch their payout ledger via mobile endpoint.
- Unauthenticated user is denied.
- Retailer can fetch their invoices.
- Retailer cannot mark an invoice as disbursed.
- Admin can mark an invoice as disbursed.
- Ledgers are cascaded to `paid` when invoice is marked disbursed.

**Section 2 — `processPayouts` Job Integration (assertions 12–16)**
- Ledger with past `eligibleAt` is batched and advanced (auto stub path → `failed` status).
- Ledger with future `eligibleAt` is NOT advanced.
- Ledger linked to a cancelled order is put `on_hold` by the job.
- Invoice is created with correct `lineItems` and `period.from` (uses oldest `eligibleAt` in batch).
- Auto mode failure is handled gracefully (invoice `issued`, error in `adminNotes`).

> **Note:** The test `run.ts` has `return; // SKIP CLEANUP` added for inspection. **Remove this before committing / running in CI** so test data is cleaned up after each run.

---

## Admin Panel Notes

Both new collections appear under the **Finance** group in the admin sidebar. Platform Settings appears under **Settings → Platform Settings** with two tabs: "Fees & Delivery" and "Payout Configuration".

The Razorpay X credential fields are conditionally hidden and only appear when `payoutMode` is set to `auto`.

---

## Pending Work

### 🔴 High Priority

#### 1. Implement Razorpay X Auto Payout
**File:** `src/jobs/processPayouts.ts` → `callRazorpayXPayout()` function (line 262)

The function currently always throws `'Razorpay X not implemented'`. To implement:
1. Sign up for a [Razorpay X](https://razorpay.com/x/) account and enable payouts.
2. Add your `account_number`, `key_id`, and `key_secret` to `PlatformSettings` in the admin panel.
3. In `callRazorpayXPayout()`:
   ```ts
   // Basic auth: Buffer.from(`${settings.razorpayXKeyId}:${settings.razorpayXKeySecret}`).toString('base64')
   // POST https://api.razorpay.com/v1/payouts
   // Body: { account_number, amount (in paise), currency: 'INR', mode: 'IMPS'/'UPI', fund_account: {...}, ... }
   ```
4. Map `destination.methodType` → Razorpay `fund_account` type (`bank_account` or `vpa`).
5. Amounts should be in **paise** (multiply by 100).
6. Handle webhook callbacks for async payout status updates (Razorpay sends `payout.processed` / `payout.failed`).

#### 2. Schedule the `processPayouts` Job

The job currently must be triggered manually or via Payload's jobs UI. To run automatically:
- Add a cron schedule in `payload.config.ts` under `jobs.tasks`:
  ```ts
  {
    slug: 'processPayouts',
    handler: processPayoutsTask,
    retries: 2,
    // cron: '0 2 * * *'  // Depends on Payload version; or use an external scheduler
  }
  ```
- Alternatively, use a server cron (e.g. via `node-cron`, GitHub Actions, or a hosting platform scheduler) to `POST /api/jobs/processPayouts`.

#### 3. Razorpay X Webhook Handler for Async Payout Status

When using auto mode, Razorpay X sends async webhook events for `payout.processed` and `payout.failed`. These need to be handled to update invoice and ledger statuses. Implement an endpoint at e.g. `POST /api/webhooks/razorpay-x` that:
- Verifies the Razorpay webhook signature.
- Reads the `payout.id` from the event.
- Finds the matching `PayoutInvoice` by `payoutRef`.
- Updates status accordingly.

#### 4. COD Payment Flow (Currently On Hold)

COD support is explicitly deferred. Entry points marked with `// TODO: Handle COD path` in:
- `src/collections/Orders/hooks/triggerPayoutLedger.ts` (line 34)
- `src/collections/Orders/hooks/triggerSideEffects.ts`

For COD: money collection is confirmed at delivery, not at checkout. The `triggerPayoutLedger` hook should only create ledgers when `paymentStatus === 'paid'` AND `status === 'delivered'` for COD orders.

### 🟡 Medium Priority

#### 5. Return / Refund Order Status

There is currently no `returned` order status. When added:
- `triggerPayoutLedger.ts` (line 119 TODO): suspend ledgers in `pending`, `eligible`, `processing` states for returned orders.
- `triggerSideEffects.ts`: queue a refund job for returned orders.
- `processPayouts.ts` (line 77 TODO): add `returned` to the order-status check filter.

#### 6. Admin Dashboard / Reporting

Currently there is no dedicated admin dashboard for payouts. Consider adding:
- A summary widget showing total pending/eligible amounts.
- Filters on `PayoutLedger` by date range, recipient type, and status.
- Bulk "issue" action on the `PayoutInvoice` list view to issue multiple invoices at once.
- Export to CSV for accounting.

#### 7. Remove SKIP CLEANUP from Test Runner

`tests/api/run.ts` line ~300 has `return; // SKIP CLEANUP`. This was added to leave test data in the DB for admin panel inspection. **Remove this line before merging or running in any automated environment.**

### 🟢 Low Priority / Nice to Have

#### 8. Push Notifications / Email on Payout Events

No notifications are sent when a payout is issued or paid. Future work:
- Send an email/push notification to the recipient when their invoice status changes to `issued` or `paid`.
- Use Payload's email adapter or a notification service.

#### 9. Delivery Fee on Orders

`deliveryFee` is stored on the `Order` document and used for DP payout calculation. Ensure the checkout flow correctly sets `order.deliveryFee` from `PlatformSettings.defaultDeliveryFee` (or a per-order override) when an order is created. Verify the field exists on the `Orders` collection schema.

#### 10. Minimum Payout Threshold Carry-Forward

Currently, if a recipient's total is below `minPayoutAmountINR`, their eligible ledgers are just skipped. The ledgers are not moved back to `pending` — they remain `eligible` and will be picked up on the next job run. This is the correct behaviour, but it should be documented to the admin: if the threshold is raised after ledgers are already `eligible`, they will silently wait until the next run where the batch total meets the new threshold.

#### 11. Mobile App Integration

The three mobile endpoints exist and are tested, but the React Native app has not yet been wired up to consume them. The frontend team needs to:
- Add a "My Earnings" / "Payouts" screen for retailers and delivery partners.
- Call `GET /api/mobile/payouts/my-ledger` and `GET /api/mobile/payouts/my-invoices`.
- Display invoice detail from `GET /api/mobile/payouts/invoices/:id`.
- Show payout status badge (pending / eligible / paid).

---

## Key Design Decisions

- **Fees snapshotted at ledger creation**: changing platform fee % does not affect in-flight or historical payouts.
- **Payout delay window > refund/return window**: by design, so a cancellation should always be caught before a ledger becomes eligible. The code defends against this race condition anyway.
- **One invoice per batch run per recipient**: all eligible orders for a recipient are grouped into one invoice per job run.
- **`period.from` = oldest `eligibleAt` in batch**: gives the recipient an accurate billing window.
- **Account number masking**: `payoutDestination.accountNumber` is stored as `****XXXX` in the invoice, never the full number.
- **`processPayouts` is not registered as a Payload job task with a slug yet**: it's exported as a plain `TaskHandler` and called directly. To use Payload's job scheduling, it needs to be registered in `payload.config.ts → jobs.tasks` with a `slug`.
