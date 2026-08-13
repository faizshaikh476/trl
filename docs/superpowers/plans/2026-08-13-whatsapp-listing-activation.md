# WhatsApp Listing Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagents are prohibited for this repository task.

**Goal:** Save valid no-credit WhatsApp intakes as unpublished listings and automatically publish the bound listing after a secure, no-login Razorpay purchase.

**Architecture:** A signed activation token authorizes access to one workspace listing for 24 hours. The resulting purchase persists that activation target, and the payment service runs one idempotent completion pipeline—grant credits, publish the target through the existing listing service, record completion, and attempt WhatsApp notification—for both checkout verification and webhook capture.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Firebase Admin/Firestore, Razorpay, Meta WhatsApp provider, Vitest.

## Global Constraints

- Preserve the existing uncommitted expired-credit fix exactly.
- Do not use subagents.
- Do not commit, push, deploy to production, switch branches, reset, clean, or revert.
- Read relevant local Next.js 16.2.9 docs before editing App Router files.
- Use TDD and observe each focused test fail for the intended reason before implementation.
- Run only focused tests and `git diff --check`.

---

### Task 1: Listing-specific activation token

**Files:**
- Create: `src/lib/billing/listing-activation-link.ts`
- Create: `src/lib/billing/listing-activation-link.test.ts`

**Interfaces:**
- Produces: `createListingActivationToken({ workspaceId, listingId, expiresAt }): string`
- Produces: `verifyListingActivationToken(token, { now?, workspaceId?, listingId? }): ListingActivationPayload | null`
- Payload: `{ workspaceId: string; listingId: string; expiresAt: string }`

- [ ] Add tests using literal payloads that accept a valid token and reject tampering, expiry, malformed tokens, missing secret, cross-workspace use, and wrong-listing use.
- [ ] Run `npm test -- src/lib/billing/listing-activation-link.test.ts`; expect failure because the module does not exist.
- [ ] Implement HMAC-SHA256 signing and constant-time verification using `PURCHASE_LINK_SECRET`, mirroring the security properties of `purchase-link.ts` without a `planId` field.
- [ ] Re-run the focused token test; expect all cases to pass.

### Task 2: Save no-credit WhatsApp intake as ready to publish

**Files:**
- Modify: `src/lib/listings/repositories/listing-repository.ts`
- Modify: `src/lib/listings/repositories/firestore-listing-repository.ts`
- Modify: `src/lib/listings/repositories/demo-listing-repository.ts`
- Modify: `src/lib/listings/listing-service.ts`
- Modify: `src/lib/listings/listing-service.test.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.test.ts`

**Interfaces:**
- Produces: `ListingService.createReadyToPublishFromExtraction(workspaceId, extraction): Promise<Listing>`
- Repository method of the same name persists status `ready_to_publish`, null publication/expiry/credit fields, and no public lookup entry.
- WhatsApp no-credit response produces `/activate/<signed-token>` for the saved listing.

- [ ] Add a listing-service test proving ready-to-publish creation does not call `consumeForListing` and returns null publication fields.
- [ ] Replace the old WhatsApp no-credit test expectation with a regression proving extraction and listing persistence occur, the session completes with the listing ID, and the reply contains exactly one verifiable listing activation token.
- [ ] Run `npm test -- src/lib/listings/listing-service.test.ts src/lib/whatsapp/whatsapp-service.test.ts`; expect failures for the missing creation API and current early credit gate.
- [ ] Add the explicit unpublished extraction method to repository implementations and expose it through `ListingService`.
- [ ] Move the WhatsApp credit decision into `createDraftFromSession`: publish through `createFromExtraction` when permitted; otherwise persist through `createReadyToPublishFromExtraction`, media/owner data, complete the session, and return the signed activation URL without requiring `DONE` again.
- [ ] Re-run the two focused test files; expect both existing immediate-publication and new no-credit behaviors to pass.

### Task 3: Activation-aware checkout without login

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/billing/payment-service.ts`
- Modify: `src/lib/billing/payment-service.test.ts`
- Modify: `src/app/api/billing/orders/route.ts`
- Create: `src/app/api/billing/orders/route.test.ts`
- Modify: `src/components/billing/razorpay-checkout.tsx`

**Interfaces:**
- `CreditPurchase` adds optional nullable `activationListingId`, `activationPhone`, `activationCompletedAt`, and `activationError` fields so legacy records and fixtures remain compatible.
- `CreatePaymentOrderInput` adds optional `activationListingId` and `activationPhone`.
- Checkout component accepts optional `activationToken` and sends it to order creation and checkout verification.

- [ ] Add payment-service tests proving activation metadata is persisted in the purchase and included in Razorpay notes, while ordinary purchases store null activation metadata.
- [ ] Add route tests proving unauthenticated order creation rejects missing/invalid tokens and accepts a valid token only when `listingService.findByWorkspaceId` returns the matching `ready_to_publish` listing; authenticated ordinary checkout remains accepted.
- [ ] Run the payment and order-route tests; expect failures for missing fields and current unconditional authentication.
- [ ] Extend purchase normalization/creation and Firestore persistence with nullable activation metadata.
- [ ] Update the order route to authorize either an authenticated workspace or a verified activation token plus matching pending listing, passing the listing ID and stored owner phone into `createOrder`.
- [ ] Pass `activationToken` through `RazorpayCheckout` order and verification request bodies.
- [ ] Re-run focused payment and route tests; expect them to pass.

### Task 4: Idempotent post-payment publication and notification

**Files:**
- Modify: `src/lib/billing/payment-service.ts`
- Modify: `src/lib/billing/payment-service.test.ts`
- Modify: `src/app/api/billing/verify/route.ts`
- Create: `src/app/api/billing/verify/route.test.ts`

**Interfaces:**
- `PaymentStore.markActivationCompleted({ purchaseId, activationCompletedAt, activationError }): Promise<CreditPurchase>` records either completion timestamp or retryable error.
- Payment dependencies add `listings.findByWorkspaceId/updateStatusInWorkspace`, `revalidateListing`, and `sendActivationMessage` adapters.
- `PaymentService.completePaidPurchase(purchase)` grants credits first, then publishes only the stored target, records completion, and sends notification best-effort.

- [ ] Add payment tests proving browser verification grants credits then publishes the bound listing; duplicate verification and webhook capture consume/publish once; publication failure retains granted credits and records a retryable activation error; normal purchases do not touch listings.
- [ ] Add verify-route tests proving unauthenticated verification requires a valid activation token matching the purchase workspace, while authenticated verification remains supported.
- [ ] Run focused payment and verify-route tests; expect failures for missing completion behavior.
- [ ] Add Firestore and in-memory store support for activation completion metadata.
- [ ] Route both `verifyCheckout` and `payment.captured` through the shared completion path. Treat an already-published listing as successful, rely on deterministic listing credit consumption for retry safety, revalidate after publication, and catch notification errors after completion.
- [ ] Update verify route authorization and return `{ purchaseId, status, activationStatus }`.
- [ ] Re-run focused tests; expect completion, retry, failure recovery, and ordinary purchase tests to pass.

### Task 5: Activation and success pages

**Files:**
- Create: `src/app/activate/[token]/page.tsx`
- Create: `src/components/billing/listing-activation-checkout.tsx`
- Modify: `src/app/pricing/success/page.tsx`
- Modify: `src/components/billing/razorpay-checkout.tsx`
- Add focused synchronous helper/component tests beside the new UI modules where async Server Component rendering is not supported by Vitest.

**Interfaces:**
- Activation page verifies the route token, loads its bound listing, and displays listing summary plus active paid packages.
- Checkout success redirects with purchase ID; success page resolves the purchase and listing and renders activated, pending, or ordinary-credit copy.

- [ ] Add pure presenter/helper tests for valid activation state, invalid/expired state, activated success with public URL, pending activation, and ordinary credit purchase copy.
- [ ] Run the new focused UI helper tests; expect failure because the presenters do not exist.
- [ ] Implement the activation page as an async Server Component using `params: Promise<{ token: string }>` and a small Client Component for package checkout.
- [ ] Extend success presentation to show `Listing activated` and the live `/l/<slug>` link only when activation completed; otherwise show the recoverable pending state. Preserve `Credits added` for ordinary purchases.
- [ ] Re-run UI helper tests and the existing pricing-section test; expect all to pass.

### Task 6: Final focused verification

**Files:**
- Review every changed file listed above plus the five pre-existing expired-credit files.

- [ ] Run all changed-domain tests in one command: activation token, listing service, WhatsApp service, payment service, billing order route, billing verify route, pricing presenter, credit wallet, billing summary, and credit actions.
- [ ] Run `git diff --check`; expect no output and exit code 0.
- [ ] Inspect `git status --short` and `git diff --stat`; confirm only scoped implementation, tests, design, plan, and the preserved expired-credit changes are present.
- [ ] Report changed files, exact test counts, preview-deployment status, and residual risks without committing or deploying.
