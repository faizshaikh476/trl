# OTP Audit And Free Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record broker OTP delivery and verification evidence while assigning every new WhatsApp broker workspace to the active Free plan.

**Architecture:** Extend claim-token metadata with a non-secret OTP audit object and update it from Meta delivery callbacks. Resolve the initial workspace plan through the billing catalogue instead of a hard-coded plan ID.

**Tech Stack:** Next.js 16 Route Handlers and Server Actions, TypeScript, Firebase Admin/Firestore, Meta WhatsApp Cloud API, Vitest.

## Global Constraints

- Never persist or log the raw OTP.
- Existing workspaces and plan assignments must not change.
- Only new WhatsApp broker workspaces receive the resolved default plan.
- Meta webhook processing must continue returning HTTP 200 for status-only callbacks.

---

### Task 1: Resolve the default plan

**Files:**
- Modify: `src/lib/billing/billing-service.ts`
- Modify: `src/lib/billing/billing-service.test.ts`
- Modify: `src/lib/whatsapp/broker-workspace-service.ts`
- Modify: `src/lib/whatsapp/broker-workspace-service.test.ts`

**Interfaces:**
- Produces: `selectDefaultPlanId(plans: Plan[]): string`
- Consumes: `billingService.listActivePlans()`

- [ ] Write failing tests proving active `free` is preferred and lowest-sort active plan is the fallback.
- [ ] Run the focused tests and confirm the hard-coded `starter` behavior fails.
- [ ] Implement default-plan selection and use it only when creating a workspace.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Persist OTP audit events

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/claims/broker-verification-service.ts`
- Create: `src/lib/claims/otp-audit.test.ts`

**Interfaces:**
- Produces: non-secret `OwnerClaimToken.otpAudit`
- Records: request, provider acceptance, send failure, failed verification attempt, and successful verification.

- [ ] Write failing tests for audit patch construction without raw OTP values.
- [ ] Run the focused tests and confirm the audit helpers are missing.
- [ ] Implement audit helpers and write them during OTP start and completion.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Capture Meta delivery statuses

**Files:**
- Modify: `src/lib/whatsapp/providers/meta-provider.ts`
- Modify: `src/lib/whatsapp/providers/meta-provider.test.ts`
- Modify: `src/lib/claims/broker-verification-service.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`

**Interfaces:**
- Produces: `parseMetaDeliveryStatuses(payload: unknown): WhatsAppDeliveryStatus[]`
- Consumes: Meta status-only webhook payloads.

- [ ] Write failing parser tests for `sent`, `delivered`, `read`, and `failed`.
- [ ] Run the focused tests and confirm the parser is missing.
- [ ] Parse status callbacks and update matching OTP audits by Meta message ID.
- [ ] Run focused tests, then lint, all tests, and the production build.
