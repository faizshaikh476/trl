# Owner Claim V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private-link seller ownership claim flow for WhatsApp-created listings.

**Architecture:** WhatsApp intake creates a workspace-scoped owner profile from the sender phone number, creates a global direct-lookup claim token, and returns a private claim URL. A public App Router page renders the claim form and a server action delegates all mutation logic to a server-only claim service.

**Tech Stack:** Next.js 16 App Router, React Server Components, Server Actions, Firebase Admin Firestore, Zod, Vitest.

---

### Task 1: Firestore Paths And Domain Types

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/firebase/paths.ts`
- Modify: `src/lib/firebase/paths.test.ts`

- [ ] Add `OwnerProfile`, `OwnerClaimToken`, and optional listing owner metadata.
- [ ] Add Firestore path helpers for `ownerProfiles` and `ownerClaimTokens`.
- [ ] Test path generation.

### Task 2: Owner Profile Service

**Files:**
- Create: `src/lib/owners/owner-profile-service.ts`
- Create: `src/lib/owners/owner-profile-service.test.ts`

- [ ] Implement `normalizePhoneNumber`, `ownerProfileIdForPhone`, `maskPhoneNumber`, and `upsertFromWhatsApp`.
- [ ] Unit test normalization and stable owner ids.

### Task 3: Claim Token Service

**Files:**
- Create: `src/lib/claims/owner-claim-service.ts`

- [ ] Implement random token creation with expiry.
- [ ] Implement token lookup with listing and owner profile hydration.
- [ ] Implement claim submission validation and Firestore updates.

### Task 4: WhatsApp Intake Integration

**Files:**
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Modify: `src/components/admin/whatsapp-intake-tester.tsx`

- [ ] Upsert owner profile after listing creation.
- [ ] Create claim token and return `claimUrl`.
- [ ] Show the claim link in Super Admin intake results.

### Task 5: Public Claim Page

**Files:**
- Create: `src/app/claim/[token]/actions.ts`
- Create: `src/app/claim/[token]/page.tsx`

- [ ] Render invalid, expired, claimed, and pending states.
- [ ] Add a server-action form for name, occupation, email, and ownership confirmation.
- [ ] Show success state after claim.

### Task 6: Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

- [ ] Fix all failures.
- [ ] Deploy production after verification.
