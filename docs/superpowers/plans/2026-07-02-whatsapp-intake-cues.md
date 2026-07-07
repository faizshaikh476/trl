# WhatsApp Intake Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add guided WhatsApp intake sessions so sellers send details/media first, type `DONE`, receive a wait cue, and then get the generated claim link.

**Architecture:** Introduce a small intake session store and inject it into `WhatsAppService`. The webhook sends an immediate reply before awaiting the service follow-up job and sending the final reply.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Firebase Admin Firestore, Vitest.

---

### Task 1: Session Store And Service Contract

**Files:**
- Create: `src/lib/whatsapp/whatsapp-intake-session-store.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Test: `src/lib/whatsapp/whatsapp-service.test.ts`

- [ ] Write a failing test for greeting, collecting, and `DONE`.
- [ ] Add the Firestore-backed session store.
- [ ] Inject dependencies into `WhatsAppService` for testability.
- [ ] Make `DONE` return an immediate wait reply and an async follow-up.
- [ ] Keep media saving and claim creation in the follow-up.

### Task 2: Webhook Replies

**Files:**
- Modify: `src/app/api/whatsapp/webhook/route.ts`

- [ ] Send the immediate reply first.
- [ ] Await and send the follow-up reply when present.
- [ ] Keep webhook responses safe for Meta retries.

### Task 3: Verification

**Files:**
- Test: `src/lib/whatsapp/whatsapp-service.test.ts`

- [ ] Run the targeted WhatsApp service test.
- [ ] Run the full test suite or the broadest practical subset.
- [ ] Build the app to catch route/type regressions.
