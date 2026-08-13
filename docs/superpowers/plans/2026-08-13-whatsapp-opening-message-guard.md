# WhatsApp Opening Message Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent clearly unrelated opening messages from starting listing intake or receiving an automated reply while preserving a low-friction introduction path for ambiguous potential customers.

**Architecture:** Add conservative local intent helpers inside the existing WhatsApp service. The message service will retain and deduplicate inbound text as it does today, then route introduction-only, clearly unrelated, property/photo, and active-intake messages without calling AI. An empty intake session acts as the one-time introduction marker; a session becomes genuine intake only after property text or an image is appended.

**Tech Stack:** TypeScript, Vitest, existing WhatsApp service/session-store interfaces.

## Global Constraints

- Do not use AI to classify opening messages.
- Retain inbound text for admin visibility before routing.
- Clearly unrelated opening messages send no reply and create no intake session.
- Ambiguous potential customers receive the introduction at most once.
- Existing property intake, photo intake, commands, retention, and deduplication behavior must remain intact.

---

### Task 1: Opening-message routing regressions

**Files:**
- Modify: `src/lib/whatsapp/whatsapp-service.test.ts`

**Interfaces:**
- Consumes: `WhatsAppService.handleWebhook(payload, provider)` and the existing in-memory session store.
- Produces: behavioral coverage for `unrelated_ignored`, one-time introduction, property activation, and active-session fragments.

- [ ] **Step 1: Write failing tests**

Add tests proving these literal outcomes:

```ts
expect(job.status).toBe("unrelated_ignored");
expect(job.reply).toBe("");
expect(await store.getActiveSession(workspaceId, phone)).toBeNull();

expect(greeting.status).toBe("collecting");
expect(greeting.reply).toContain("property details");
expect(repeatedGreeting.reply).toBe("");

expect(ambiguous.reply).toContain("property details");
expect(session?.messages).toEqual([]);
expect(ambiguousFollowUp.reply).toBe("");

expect(property.status).toBe("collecting");
expect(propertySession?.messages).toEqual([propertyText]);
expect(fragmentSession?.messages).toEqual([propertyText, "Available immediately"]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/whatsapp/whatsapp-service.test.ts`

Expected: failures showing the current service returns the property collection acknowledgement for job/ambiguous text and repeats the introduction for an empty greeting session.

---

### Task 2: Conservative local routing guard

**Files:**
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Test: `src/lib/whatsapp/whatsapp-service.test.ts`

**Interfaces:**
- Produces: `hasPropertySignal(text: string): boolean`, `isClearlyUnrelatedOpening(text: string): boolean`, and broadened `isGreeting(text: string): boolean` as private module helpers.
- Preserves: `WhatsAppWebhookResult`, `WhatsAppIntakeSessionStore`, and every external service interface.

- [ ] **Step 1: Implement the minimal routing helpers**

Use the existing `propertySignalPatterns` for a one-signal opening check. Add a narrow career-intent pattern matching phrases such as job opportunity, vacancy, career, resume/CV submission, hiring, and employment. Broaden greeting-only recognition without matching messages that contain additional requests.

- [ ] **Step 2: Route messages before appending intake content**

For a session with no messages or media:

```ts
if (text && isClearlyUnrelatedOpening(text)) {
  return { status: "unrelated_ignored", to: message.from, reply: "" };
}
if (!imageMedia.length && !hasPropertySignal(text)) {
  if (existingSession) return { status: "introduction_silent", to: message.from, reply: "" };
  await sessionStore.startSession(workspaceId, phone);
  return { status: "collecting", to: message.from, reply: introduction };
}
```

If the session already contains property text or images, preserve the existing append-and-acknowledge behavior so fragmented follow-ups remain valid.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run: `npm test -- src/lib/whatsapp/whatsapp-service.test.ts`

Expected: all WhatsApp service tests pass.

---

### Task 3: Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes the completed repository state.
- Produces local evidence that the change is safe to release.

- [ ] **Step 1: Run full checks**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: zero failures and a successful Next.js production build.

- [ ] **Step 2: Review scope**

Confirm the implementation changes only `src/lib/whatsapp/whatsapp-service.ts`, its focused test, and these approved planning documents. Do not deploy until explicitly requested.
