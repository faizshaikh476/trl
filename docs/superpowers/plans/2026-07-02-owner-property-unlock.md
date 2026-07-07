# Owner Property Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move broker verification onto the shareable property page and unlock the normal broker listing workflow after one-time verification.

**Architecture:** Publish WhatsApp-created listings immediately, render the verification modal from the same `/l/[slug]` URL for logged-in brokers with a pending token, and update WhatsApp replies to include only the public property link.

**Tech Stack:** Next.js App Router, Server Actions, Firebase Admin Firestore, signed HTTP-only cookies, Vitest.

---

### Task 1: Listing Lookup And Metadata

**Files:**
- Modify: `src/lib/listings/repositories/listing-repository.ts`
- Modify: `src/lib/listings/repositories/firestore-listing-repository.ts`
- Modify: `src/lib/listings/listing-service.ts`
- Modify: `src/app/l/[slug]/page.tsx`

- [ ] Publish WhatsApp-created listings immediately.
- [ ] Use `/l/[slug]` as the single shareable URL.
- [ ] Add dynamic metadata with first property image when available.

### Task 2: Broker Verification Modal

**Files:**
- Create: `src/app/l/[slug]/actions.ts`
- Create: `src/components/public/owner-verification-modal.tsx`
- Modify: `src/lib/claims/owner-claim-service.ts`
- Modify: `src/app/l/[slug]/page.tsx`
- Modify: `src/app/login/actions.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/auth/login-form.tsx`

- [ ] Lookup pending claim token from the listing for signed-in brokers.
- [ ] Render modal only for a valid unclaimed token matching the current listing and workspace.
- [ ] Claim once and redirect to the same property page.

### Task 3: WhatsApp Reply

**Files:**
- Modify: `src/lib/claims/owner-claim-service.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Test: `src/lib/whatsapp/whatsapp-service.test.ts`

- [ ] Send only the shareable property URL in WhatsApp.
- [ ] Update tests for the new reply text.
