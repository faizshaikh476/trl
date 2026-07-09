# Listing Credit Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace concurrent listing limits with 30-day listing-credit wallets, publish Firestore-backed pricing, and sell credit packages through verified Razorpay one-time payments and direct WhatsApp purchase links.

**Architecture:** Firestore plans remain the pricing source of truth, while each workspace receives a transactional wallet and immutable ledger. Publishing consumes a credit exactly once; Razorpay Orders and webhooks grant credits idempotently; a scheduled route expires listings after 60 days and active wallets permit free reactivation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firestore transactions, Firebase Auth sessions, Razorpay Orders API, Vercel Cron, Vitest.

## Global Constraints

- Packages are one-time purchases, never recurring subscriptions.
- Package credits remain usable for 30 days.
- New publication consumes one credit permanently.
- Unpublishing, archiving, selling, renting, or deleting never refunds a credit.
- A listing remains public for 60 days, then requires reactivation.
- Reactivation consumes no credit but requires an active wallet.
- A new purchase carries unused credits forward and resets wallet validity to 30 days from purchase.
- Prices and credit quantities are resolved on the server.
- Credit grants and consumption must be transactional and idempotent.
- Existing listings and workspaces require a non-destructive migration.

---

### Task 1: Extend Billing Domain And Plan Validation

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/billing/billing-service.ts`
- Modify: `src/lib/billing/billing-service.test.ts`

**Interfaces:**
- Produces: `Plan.amountPaise`, `Plan.currency`, `Plan.listingCredits`, `Plan.creditValidityDays`, `Plan.listingVisibilityDays`, and `Plan.featured`.
- Produces: `parsePlanInput(formData): PlanInput`.

- [ ] **Step 1: Write failing tests for numeric package parsing**

Add tests asserting that `parsePlanInput` returns:

```ts
{
  name: "Growth",
  amountPaise: 799900,
  currency: "INR",
  listingCredits: 50,
  creditValidityDays: 30,
  listingVisibilityDays: 60,
  featured: true,
  status: "active",
  sortOrder: 20,
}
```

Also assert rejection of non-integer paise, zero credits, and unsupported currency.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/lib/billing/billing-service.test.ts`

Expected: FAIL because the new plan fields are not parsed.

- [ ] **Step 3: Replace display-only plan fields**

Define:

```ts
export interface Plan {
  id: string;
  name: string;
  description: string;
  amountPaise: number;
  currency: "INR";
  listingCredits: number;
  creditValidityDays: number;
  listingVisibilityDays: number;
  featured: boolean;
  status: "active" | "inactive";
  sortOrder: number;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}
```

Update defaults and `parsePlanInput` with positive whole-number validation. Add `formatPlanPrice(plan)` for display copy.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/billing/billing-service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/lib/billing/billing-service.ts src/lib/billing/billing-service.test.ts
git commit -m "Add listing credit package fields"
```

### Task 2: Add Wallet And Immutable Credit Ledger

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/firebase/paths.ts`
- Create: `src/lib/billing/credit-wallet-service.ts`
- Create: `src/lib/billing/credit-wallet-service.test.ts`

**Interfaces:**
- Produces: `CreditWallet`, `CreditLedgerEntry`, and `CreditPurchase`.
- Produces: `creditWalletService.grantCredits(input)`, `consumeForListing(input)`, `assertCanReactivate(workspaceId)`, and `getBalance(workspaceId)`.

- [ ] **Step 1: Write failing transactional wallet tests**

Cover:

```ts
await service.grantCredits({
  workspaceId: "workspace_1",
  quantity: 10,
  validityDays: 30,
  sourceId: "purchase_1",
  sourceType: "purchase",
});
```

Assert balance `10`; a second identical grant remains `10`; consuming `listing_1` twice leaves `9`; archiving does not call a refund API; a second purchase adds credits and sets expiry to 30 days from the second purchase.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/billing/credit-wallet-service.test.ts`

Expected: FAIL because the wallet service does not exist.

- [ ] **Step 3: Add Firestore paths and domain types**

Use:

```ts
workspaceWallet: (workspaceId: string) => `workspaces/${workspaceId}/billing/wallet`,
workspaceCreditLedger: (workspaceId: string) => `workspaces/${workspaceId}/creditLedger`,
workspaceCreditEntry: (workspaceId: string, entryId: string) =>
  `workspaces/${workspaceId}/creditLedger/${entryId}`,
purchases: () => "purchases",
purchase: (purchaseId: string) => `purchases/${purchaseId}`,
```

Wallet fields: `availableCredits`, `validUntil`, `lastPurchaseId`, `createdAt`, `updatedAt`.

- [ ] **Step 4: Implement transaction-safe grants and consumption**

Use deterministic ledger IDs:

```ts
grant:${sourceType}:${sourceId}
consume:listing:${listingId}
```

Within one Firestore transaction, check the ledger entry, update the wallet, and create the entry. Throw `NoListingCreditsError` when balance is zero or wallet expired.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/billing/credit-wallet-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts src/lib/firebase/paths.ts src/lib/billing/credit-wallet-service.ts src/lib/billing/credit-wallet-service.test.ts
git commit -m "Add transactional listing credit wallet"
```

### Task 3: Enforce Credits During Publication

**Files:**
- Modify: `src/lib/billing/billing-service.ts`
- Modify: `src/lib/billing/billing-service.test.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.test.ts`
- Modify: `src/lib/listings/listing-service.ts`
- Modify: relevant listing service tests discovered with `rg "publish" src/lib/listings -g '*test.ts'`

**Interfaces:**
- Consumes: `creditWalletService.consumeForListing`.
- Produces: publication that records `creditConsumedAt`, `creditLedgerEntryId`, and `expiresAt`.

- [ ] **Step 1: Write failing publication tests**

Assert:

- First publication consumes one credit.
- Retrying publication for the same listing consumes none.
- Publishing an already published listing consumes none.
- Archiving, sold, rented, unpublishing, and deleting do not increase balance.
- New listings fail with `NoListingCreditsError` at zero balance.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/lib/billing/billing-service.test.ts src/lib/whatsapp/whatsapp-service.test.ts`

Expected: FAIL under the current concurrent-limit behavior.

- [ ] **Step 3: Replace concurrent count enforcement**

Remove `calculatePlanUsage` as the publication authority. Before first publication:

```ts
const consumption = await creditWalletService.consumeForListing({
  workspaceId: listing.workspaceId,
  listingId: listing.id,
});
```

Persist:

```ts
creditLedgerEntryId: consumption.ledgerEntryId,
creditConsumedAt: consumption.createdAt,
publishedAt: existingPublishedAt ?? now,
expiresAt: addDays(now, plan.listingVisibilityDays).toISOString(),
```

- [ ] **Step 4: Update WhatsApp publication balance**

Read wallet balance after publication and report remaining credits. Preserve intake when `NoListingCreditsError` occurs.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/billing/billing-service.test.ts src/lib/whatsapp/whatsapp-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing src/lib/listings src/lib/whatsapp
git commit -m "Enforce listing credits on first publication"
```

### Task 4: Upgrade Admin Plan Builder And Wallet Operations

**Files:**
- Modify: `src/app/admin/subscriptions/page.tsx`
- Modify: `src/server-actions/billing-actions.ts`
- Modify: `src/app/admin/workspaces/page.tsx`
- Create: `src/server-actions/credit-actions.ts`
- Create: `src/server-actions/credit-actions.test.ts`

**Interfaces:**
- Consumes: expanded `PlanInput`.
- Produces: `grantPromotionalCreditsAction(workspaceId, formData)`.

- [ ] **Step 1: Write failing action validation tests**

Assert only super admins can grant a positive whole number of promotional credits and every grant requires a reason.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/server-actions/credit-actions.test.ts`

Expected: FAIL because the action does not exist.

- [ ] **Step 3: Build the expanded admin plan form**

Fields: name, description, amount in rupees, listing credits, credit validity days, listing visibility days, featured, order, and status. Convert rupees to paise server-side without floating-point arithmetic.

- [ ] **Step 4: Add workspace wallet inspection and grant controls**

Show available credits, validity, and last grant. Require a reason and confirmation before granting promotional credits.

- [ ] **Step 5: Run tests and lint**

Run: `npm test -- src/server-actions/credit-actions.test.ts && npm run lint`

Expected: PASS with no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/server-actions
git commit -m "Manage listing packages and credit wallets"
```

### Task 5: Render Firestore-Backed Public Pricing

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/public/pricing-section.tsx`
- Create: `src/components/public/pricing-section.test.tsx`
- Create: `src/app/pricing/page.tsx`

**Interfaces:**
- Consumes: `billingService.listActivePlans()`.
- Produces: package URLs `/pricing?plan=<planId>`.

- [ ] **Step 1: Write failing pricing tests**

Render active and inactive plans and assert only active plans appear, ordered by `sortOrder`, with formatted INR price, listing credits, 30-day validity, and 60-day visibility.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/components/public/pricing-section.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the shared pricing section**

Use compact responsive cards with a single prominent action. The featured package may be visually emphasized, but no package may contain invented benefits.

- [ ] **Step 4: Add homepage and dedicated pricing page**

Fetch plans server-side. The pricing page accepts an optional selected plan and sends authenticated brokers toward checkout while preserving `/login?next=/pricing?plan=<id>` for signed-out users.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- src/components/public/pricing-section.test.tsx && npm run build`

Expected: PASS and successful Next.js production build.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/pricing src/components/public/pricing-section.tsx src/components/public/pricing-section.test.tsx
git commit -m "Add live package pricing pages"
```

### Task 6: Implement Razorpay Orders And Verified Credit Grants

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `src/lib/billing/razorpay-client.ts`
- Create: `src/lib/billing/payment-service.ts`
- Create: `src/lib/billing/payment-service.test.ts`
- Create: `src/app/api/billing/orders/route.ts`
- Create: `src/app/api/billing/verify/route.ts`
- Create: `src/app/api/billing/webhook/route.ts`
- Create: `src/components/billing/razorpay-checkout.tsx`
- Create: `src/app/pricing/success/page.tsx`

**Interfaces:**
- Produces: `paymentService.createOrder({ workspaceId, planId, idempotencyKey })`.
- Produces: `paymentService.verifyCheckout(input)` and `processWebhook(rawBody, signature)`.

- [ ] **Step 1: Add Razorpay SDK and failing payment tests**

Run: `npm install razorpay`

Test server-resolved price, HMAC verification, duplicate callbacks, duplicate webhooks, failed payment, and exactly-once credit grants.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/billing/payment-service.test.ts`

Expected: FAIL because payment service is absent.

- [ ] **Step 3: Implement server-only Razorpay client**

Require:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

Never expose `RAZORPAY_KEY_SECRET` or webhook secret.

- [ ] **Step 4: Implement purchase lifecycle**

Create a pending `CreditPurchase`, create a Razorpay Order in paise, verify `razorpay_order_id|razorpay_payment_id` HMAC, mark paid transactionally, then call `grantCredits` with the purchase ID.

- [ ] **Step 5: Implement raw-body webhook verification**

Handle `payment.captured`, `payment.failed`, and `refund.processed`. Store provider event IDs and ignore duplicates.

- [ ] **Step 6: Implement checkout UI and success page**

The browser receives only order ID, amount, currency, plan label, and public key. After callback verification, redirect to `/pricing/success?purchase=<id>`.

- [ ] **Step 7: Run tests and build**

Run: `npm test -- src/lib/billing/payment-service.test.ts && npm run build`

Expected: PASS and successful build.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/billing src/app/api/billing src/components/billing src/app/pricing
git commit -m "Add verified Razorpay package checkout"
```

### Task 7: Add Signed Direct Purchase Links To WhatsApp

**Files:**
- Create: `src/lib/billing/purchase-link.ts`
- Create: `src/lib/billing/purchase-link.test.ts`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `createPurchaseLinkToken({ workspaceId, planId, expiresAt })`.
- Produces: `verifyPurchaseLinkToken(token)`.

- [ ] **Step 1: Write failing signed-link and WhatsApp tests**

Assert valid links resolve the intended workspace and plan; tampered, expired, or cross-workspace links fail; zero-credit WhatsApp replies include every active paid plan with price and direct URL.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/billing/purchase-link.test.ts src/lib/whatsapp/whatsapp-service.test.ts`

Expected: FAIL because signed purchase links are absent.

- [ ] **Step 3: Implement HMAC purchase tokens**

Add:

```env
PURCHASE_LINK_SECRET=
```

Sign a base64url payload with HMAC-SHA256 and a 24-hour expiry. Authentication remains mandatory before checkout.

- [ ] **Step 4: Generate package-specific WhatsApp links**

Use `${getPublicBaseUrl()}/pricing?purchase=<token>`. Keep the intake session unchanged when publication is blocked so `DONE` can be retried after payment.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/billing/purchase-link.test.ts src/lib/whatsapp/whatsapp-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/lib/billing/purchase-link.ts src/lib/billing/purchase-link.test.ts src/lib/whatsapp src/app/pricing/page.tsx
git commit -m "Send direct package links on WhatsApp"
```

### Task 8: Expire And Reactivate Listings

**Files:**
- Create: `src/lib/listings/listing-expiry-service.ts`
- Create: `src/lib/listings/listing-expiry-service.test.ts`
- Create: `src/app/api/cron/expire-listings/route.ts`
- Modify: `src/server-actions/listing-actions.ts`
- Modify: `src/app/dashboard/listings/[id]/page.tsx`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `listingExpiryService.expireDueListings(now)`.
- Produces: `reactivateListingAction(listingId)`.

- [ ] **Step 1: Write failing expiry and reactivation tests**

Assert only due published listings become expired; repeated cron runs are safe; expired listings remain saved; reactivation requires an active wallet, consumes zero credits, and sets a new 60-day expiry.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/listings/listing-expiry-service.test.ts`

Expected: FAIL because expiry service does not exist.

- [ ] **Step 3: Implement idempotent expiry service and protected route**

Require `Authorization: Bearer ${CRON_SECRET}`. Update only listings whose current status remains `published` and `expiresAt <= now`.

- [ ] **Step 4: Configure daily Vercel Cron**

Add:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["bom1"],
  "crons": [{ "path": "/api/cron/expire-listings", "schedule": "15 1 * * *" }]
}
```

- [ ] **Step 5: Add broker reactivation action**

Verify workspace ownership, call `assertCanReactivate`, and set `status: "published"` with a fresh plan-derived visibility window.

- [ ] **Step 6: Run tests and build**

Run: `npm test -- src/lib/listings/listing-expiry-service.test.ts && npm run build`

Expected: PASS and successful build.

- [ ] **Step 7: Commit**

```bash
git add vercel.json src/lib/listings/listing-expiry-service.ts src/lib/listings/listing-expiry-service.test.ts src/app/api/cron src/server-actions/listing-actions.ts src/app/dashboard/listings
git commit -m "Expire and reactivate property listings"
```

### Task 9: Migrate Existing Plans, Wallets, And Listings

**Files:**
- Create: `scripts/migrate-listing-credits.ts`
- Create: `src/lib/billing/migration.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: idempotent `npm run billing:migrate`.

- [ ] **Step 1: Write failing migration tests**

Cover legacy `priceLabel` conversion, current plan allowance to initial wallet credits, deterministic ledger entries for existing listings, and 60-day expiry from `publishedAt` with `updatedAt` fallback.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/billing/migration.test.ts`

Expected: FAIL because migration helpers are absent.

- [ ] **Step 3: Implement dry-run-first migration**

Default to dry run. Require `--apply` for writes. Use deterministic IDs:

```ts
migration:initial-wallet:<workspaceId>
migration:existing-listing:<listingId>
```

Never reduce an existing wallet or overwrite a newer listing expiry.

- [ ] **Step 4: Run tests and dry run**

Run:

```bash
npm test -- src/lib/billing/migration.test.ts
npm run billing:migrate
```

Expected: tests PASS and dry run prints counts without writes.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/migrate-listing-credits.ts src/lib/billing/migration.test.ts
git commit -m "Add listing credit migration"
```

### Task 10: End-To-End Verification

**Files:**
- Modify only files required by verified defects.

**Interfaces:**
- Consumes all prior tasks.
- Produces a production-ready release candidate.

- [ ] **Step 1: Run complete automated verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests PASS, lint exits zero, build succeeds.

- [ ] **Step 2: Verify Razorpay test-mode checkout**

Create a test package, purchase it with a Razorpay test payment, verify one purchase record, one credit grant, the correct balance, and successful duplicate webhook handling.

- [ ] **Step 3: Verify WhatsApp zero-credit recovery**

Use a zero-credit test workspace, submit an intake, confirm direct package links arrive, complete test payment, send `DONE`, and confirm exactly one credit is consumed and the retained listing publishes.

- [ ] **Step 4: Verify responsive public pricing and dashboard**

Test 320px, 375px, 390px, and desktop widths. Confirm no horizontal overflow, checkout controls are at least 48px tall, and plan copy matches Firestore.

- [ ] **Step 5: Verify expiry and reactivation**

Expire a fixture listing, confirm its public route is unavailable, reactivate under an active wallet, and confirm the credit balance is unchanged.

- [ ] **Step 6: Commit verified fixes**

```bash
git add src/app src/components src/lib src/server-actions
git commit -m "Verify listing credit purchase flow"
```
