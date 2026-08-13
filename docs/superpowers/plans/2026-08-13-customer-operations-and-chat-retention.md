# Customer Operations and WhatsApp Chat Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a paginated customer/prospect operations directory with precise lifecycle states, 180-day text-only WhatsApp history, single-admin follow-up tools, and safe direct replies.

**Architecture:** A global Firestore customer-activity projection provides deterministic directory queries without replacing authoritative workspace, billing, wallet, listing, or authentication records. Text-only message records and body-free operational events live below each contact; domain and webhook entry points update the projection through a focused customer-operations service.

**Tech Stack:** Next.js 16.2 App Router, React 19 Server/Client Components and Server Actions, TypeScript, Firebase Admin/Firestore, Meta WhatsApp Cloud API, Vitest, Tailwind CSS, shadcn/Radix primitives.

## Global Constraints

- Retain WhatsApp text and captions for exactly 180 days.
- Never write chat media binaries, URLs, provider media IDs, or copied listing media references to conversation records.
- Keep body-free operational events after message expiry.
- A workspace created automatically from WhatsApp does not make a person a customer.
- Classify a person as a customer only after a paid purchase or a claimed/authenticated broker account.
- Treat `validUntil` as authoritative and obtain effective credits from the credit wallet service.
- Use server-side cursor pagination with 25 rows per page and newest activity first by default.
- Keep staff assignment and multi-agent queues out of scope; this is a single-admin tool.
- Permit free-form WhatsApp replies only within 24 hours of the latest inbound customer message; otherwise require an approved template.
- Preserve existing billing, listing, workspace, authentication, and chat-intake source-of-truth records.
- Follow TDD for every behavior: add one focused failing test, observe the intended failure, make the minimum implementation, and rerun the focused test.
- Read the relevant guides in `node_modules/next/dist/docs/` before editing App Router code. Use the page `searchParams` prop for server data queries, keep database access in Server Components/services, and authenticate inside every Server Action.
- Backfill is dry-run unless explicitly invoked with `--apply`.
- Do not deploy Firestore configuration, run the live backfill, or deploy Vercel without separate production-release approval.

---

## File Structure

### New customer-operations domain files

- `src/lib/customer-operations/customer-operations.types.ts`: serializable activity, message, event, query, cursor, and detail types.
- `src/lib/customer-operations/customer-state.ts`: pure classification, stage precedence, wallet labels, search tokens, contact IDs, expiry, and service-window rules.
- `src/lib/customer-operations/customer-state.test.ts`: exhaustive pure-rule tests.
- `src/lib/customer-operations/customer-operations-repository.ts`: persistence interface used by services and tests.
- `src/lib/customer-operations/firestore-customer-operations-repository.ts`: Admin Firestore storage, queries, cursors, message deletion, and status updates.
- `src/lib/customer-operations/customer-operations-service.ts`: projection/event/message orchestration with dependency injection.
- `src/lib/customer-operations/customer-operations-service.test.ts`: fake-repository service tests.
- `src/lib/customer-operations/customer-directory-model.ts`: validated URL query parsing and display-model helpers.
- `src/lib/customer-operations/customer-directory-model.test.ts`: query and presentation tests.
- `src/lib/whatsapp/whatsapp-message-sender.ts`: one retained outbound path shared by automation, payment activation, and admin replies.
- `src/lib/whatsapp/whatsapp-message-sender.test.ts`: intent-before-send, failure, template, retry, and no-media tests.

### New UI and actions

- `src/components/admin/customer-directory.tsx`: server-renderable table, tabs, filters, and cursor links.
- `src/components/admin/customer-detail-drawer.tsx`: focused client boundary for drawer tabs and interactive forms.
- `src/components/admin/customer-conversation.tsx`: text-only conversation and delivery-state presentation.
- `src/server-actions/customer-operations-actions.ts`: authenticated management, deletion, and reply actions.
- `src/server-actions/customer-operations-actions.test.ts`: action validation, authorization, and send tests.

### New migration

- `scripts/backfill-customer-activity.ts`: idempotent dry-run/apply backfill from authoritative records.
- `src/lib/customer-operations/customer-backfill.ts`: testable backfill orchestration.
- `src/lib/customer-operations/customer-backfill.test.ts`: no-mutation and idempotency tests.

### Existing integration files

- `src/lib/firebase/paths.ts`: customer activity, message, and event paths.
- `firebase/firestore.indexes.json`: directory query indexes and message TTL override.
- `src/lib/firebase/firestore-indexes.test.ts`: manifest regression tests.
- `src/lib/whatsapp/whatsapp-service.ts`: retain inbound text before intake and emit activity events.
- `src/lib/whatsapp/whatsapp-service.test.ts`: inbound ordering, idempotency, and no-media tests.
- `src/lib/whatsapp/whatsapp-intake-session-store.ts` and `.test.ts`: expire abandoned intake buffers and scrub completed/cancelled message/media arrays.
- `src/app/api/whatsapp/webhook/route.ts`: retain automated outbound text and update delivery states.
- `src/app/api/whatsapp/webhook/route.test.ts`: outbound persistence and delivery webhook tests.
- `src/lib/whatsapp/whatsapp-provider.ts`: approved-template send interface.
- `src/lib/whatsapp/providers/meta-provider.ts`: Meta template request.
- `src/lib/whatsapp/providers/meta-provider.test.ts`: template payload tests.
- `src/lib/billing/payment-service.ts` and `.test.ts`: purchase outcome projection/events.
- `src/server-actions/listing-actions.ts` and `.test.ts`: admin/dashboard listing outcome projection/events.
- `src/lib/claims/broker-verification-service.ts`: claimed-account projection/event.
- `src/lib/claims/broker-verification-service.test.ts`: claimed-account projection regression test.
- `src/server-actions/billing-actions.ts`: plan management projection/event.
- `src/server-actions/billing-actions.test.ts`: plan projection and validation tests.
- `src/server-actions/credit-actions.ts` and `.test.ts`: grant projection/event.
- `src/lib/audit/audit-log-service.ts` and `.test.ts`: write and read body-free admin audit records.
- `src/app/admin/workspaces/page.tsx`: server query and new directory/drawer composition.
- `.env.example`: follow-up template name and language configuration.
- `package.json`: safe backfill script.

---

### Task 1: Pure customer lifecycle model

**Files:**
- Create: `src/lib/customer-operations/customer-operations.types.ts`
- Create: `src/lib/customer-operations/customer-state.ts`
- Create: `src/lib/customer-operations/customer-state.test.ts`

**Interfaces:**
- Produces: `contactIdForPhone(phone: string): string`
- Produces: `classifyContact(input: ClassificationInput): "customer" | "prospect"`
- Produces: `deriveJourneyStage(input: JourneyInput): CustomerJourneyStage`
- Produces: `deriveWalletState(wallet: CreditWallet | null, effectiveCredits: number, now: Date): WalletSummary`
- Produces: `messageExpiresAt(createdAt: Date): string`
- Produces: `isInsideCustomerServiceWindow(lastInboundAt: string | null, now: Date): boolean`
- Produces: `buildSearchTokens(values: Array<string | null | undefined>): string[]`

- [ ] **Step 1: Write failing classification, stage, wallet, retention, window, and token tests**

```ts
it("does not classify an auto-created workspace as a customer", () => {
  expect(classifyContact({ hasWorkspace: true, hasPaidPurchase: false, hasAuthenticatedUser: false })).toBe("prospect");
});

it("gives payment failure precedence over a ready listing", () => {
  expect(deriveJourneyStage({ paymentFailed: true, paymentPending: false, needsAttention: false, hasReadyListing: true, hasIntake: true, isCustomer: false })).toBe("payment_failed");
});

it("labels a stale wallet expired with zero usable credits", () => {
  expect(deriveWalletState({ availableCredits: 9, validUntil: "2026-08-12T00:00:00.000Z", lastPurchaseId: null, createdAt: "", updatedAt: "" }, 0, new Date("2026-08-13T00:00:00.000Z"))).toEqual({ state: "expired", effectiveCredits: 0, label: "Expired" });
});

it("expires message text exactly 180 days after creation", () => {
  expect(messageExpiresAt(new Date("2026-08-13T00:00:00.000Z"))).toBe("2027-02-09T00:00:00.000Z");
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm test -- src/lib/customer-operations/customer-state.test.ts`

Expected: FAIL because the module and functions do not exist.

- [ ] **Step 3: Implement the types and minimal pure functions**

```ts
export type CustomerJourneyStage = "new_chat" | "listing_started" | "ready_to_publish" | "payment_pending" | "payment_failed" | "customer" | "needs_attention";
export type CustomerClassification = "customer" | "prospect";
export type WalletState = "never_funded" | "expired" | "empty" | "active";
export type CustomerEventType = "first_contact" | "message_received" | "message_sent" | "media_received" | "media_sent" | "intake_started" | "intake_completed" | "listing_saved" | "listing_published" | "listing_archived" | "purchase_created" | "purchase_paid" | "purchase_failed" | "purchase_refunded" | "wallet_funded" | "wallet_consumed" | "wallet_expired" | "account_claimed" | "plan_changed" | "credits_granted" | "follow_up_changed" | "management_changed" | "conversation_deleted";

export interface ClassificationInput { hasWorkspace: boolean; hasPaidPurchase: boolean; hasAuthenticatedUser: boolean }
export interface JourneyInput { needsAttention: boolean; paymentFailed: boolean; paymentPending: boolean; hasReadyListing: boolean; hasIntake: boolean; isCustomer: boolean }
export interface WalletSummary { state: WalletState; effectiveCredits: number; label: string }

export interface CustomerActivity {
  id: string;
  phone: string;
  displayName: string;
  workspaceId: string;
  authenticatedUserId: string | null;
  classification: CustomerClassification;
  stage: CustomerJourneyStage;
  walletState: WalletState;
  effectiveCredits: number;
  planId: string;
  paymentState: "none" | "pending" | "paid" | "failed" | "refunded";
  listingCounts: { total: number; ready: number; published: number };
  searchTokens: string[];
  firstSeenAt: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastActivityAt: string;
  latestActivityLabel: string;
  tags: string[];
  privateNote: string;
  followUpAt: string | null;
  resolution: "open" | "resolved";
  historyRetainedFrom: string;
}

export interface CustomerMessage {
  id: string;
  contactId: string;
  workspaceId: string;
  direction: "inbound" | "outbound";
  senderType: "customer" | "automation" | "admin";
  text: string;
  providerMessageId: string | null;
  deliveryStatus: "pending" | "sent" | "delivered" | "read" | "failed";
  failureSummary: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CustomerEvent {
  id: string;
  contactId: string;
  workspaceId: string;
  type: CustomerEventType;
  label: string;
  sourceId: string | null;
  listingId: string | null;
  occurredAt: string;
}

export function classifyContact(input: ClassificationInput): CustomerClassification {
  return input.hasPaidPurchase || input.hasAuthenticatedUser ? "customer" : "prospect";
}

export function messageExpiresAt(createdAt: Date) {
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 180);
  return expiresAt.toISOString();
}

export function isInsideCustomerServiceWindow(lastInboundAt: string | null, now: Date) {
  if (!lastInboundAt) return false;
  const elapsed = now.getTime() - Date.parse(lastInboundAt);
  return elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000;
}
```

Implement stage precedence as `needs_attention`, `payment_failed`, `payment_pending`, `ready_to_publish`, `listing_started`, `customer`, then `new_chat`. Generate bounded lowercase word prefixes of length 2–32 plus exact normalized phone/ID tokens; deduplicate and cap the stored token array at 200.

- [ ] **Step 4: Run the focused test and observe GREEN**

Run: `npm test -- src/lib/customer-operations/customer-state.test.ts`

Expected: all lifecycle-model tests pass.

- [ ] **Step 5: Commit the pure model**

```bash
git add src/lib/customer-operations/customer-operations.types.ts src/lib/customer-operations/customer-state.ts src/lib/customer-operations/customer-state.test.ts
git commit -m "Add customer lifecycle model"
```

---

### Task 2: Firestore repository, cursors, indexes, and TTL

**Files:**
- Modify: `src/lib/firebase/paths.ts`
- Create: `src/lib/customer-operations/customer-operations-repository.ts`
- Create: `src/lib/customer-operations/firestore-customer-operations-repository.ts`
- Create: `src/lib/customer-operations/firestore-customer-operations-repository.test.ts`
- Modify: `firebase/firestore.indexes.json`
- Modify: `src/lib/firebase/firestore-indexes.test.ts`

**Interfaces:**
- Consumes: Task 1 activity/message/event/query types and `contactIdForPhone`.
- Produces: `CustomerOperationsRepository` with `getActivity`, `upsertActivity`, `queryActivities`, `countActivities`, `saveMessage`, `updateMessageDelivery`, `listMessages`, `deleteMessages`, `appendEvent`, and `listEvents`.
- Produces: opaque cursor strings containing the last scanned sort value and activity ID.

- [ ] **Step 1: Write failing repository contract and manifest tests**

```ts
it("returns stable newest-first pages when activity timestamps tie", async () => {
  const first = await repository.queryActivities({ tab: "all", sort: "last_activity_desc", pageSize: 2, cursor: null, filters: {}, searchToken: null });
  expect(first.items.map((item) => item.id)).toEqual(["contact_c", "contact_b"]);
  const second = await repository.queryActivities({ tab: "all", sort: "last_activity_desc", pageSize: 2, cursor: first.nextCursor, filters: {}, searchToken: null });
  expect(second.items.map((item) => item.id)).toEqual(["contact_a"]);
});

it("declares TTL for customer message expiry", () => {
  expect(manifest.fieldOverrides).toContainEqual({ collectionGroup: "customerMessages", fieldPath: "expiresAt", ttl: true, indexes: [] });
  expect(manifest.fieldOverrides).toContainEqual({ collectionGroup: "intakeSessions", fieldPath: "expiresAt", ttl: true, indexes: [] });
});
```

Also assert that saving a message strips unknown media-shaped properties and that duplicate provider message IDs return the existing record.

- [ ] **Step 2: Run repository and manifest tests and observe RED**

Run: `npm test -- src/lib/customer-operations/firestore-customer-operations-repository.test.ts src/lib/firebase/firestore-indexes.test.ts`

Expected: FAIL because paths, repository, query indexes, and TTL override are absent.

- [ ] **Step 3: Add paths, repository interface, and Firestore implementation**

```ts
customerActivities: () => "customerActivities",
customerActivity: (contactId: string) => `customerActivities/${contactId}`,
customerMessages: (contactId: string) => `customerActivities/${contactId}/customerMessages`,
customerMessage: (contactId: string, messageId: string) => `customerActivities/${contactId}/customerMessages/${messageId}`,
customerEvents: (contactId: string) => `customerActivities/${contactId}/customerEvents`,
```

Use `orderBy(sortField, direction).orderBy("id", direction)` and `startAfter(sortValue, id)`. Encode cursor JSON with base64url and reject malformed cursors. Use `create()` or a transaction keyed by safe provider message ID for inbound idempotency. Persist only explicitly selected message fields.

For combined filters, select one indexed Firestore constraint (classification, search token, or the first active facet), scan in sort order until 25 matching records are collected, and encode the last scanned document in the cursor. Apply remaining equality facets in the repository so pagination remains deterministic without requiring every possible composite-index permutation.

- [ ] **Step 4: Add bounded indexes and TTL configuration**

```json
{
  "collectionGroup": "customerActivities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "classification", "order": "ASCENDING" },
    { "fieldPath": "lastActivityAt", "order": "DESCENDING" },
    { "fieldPath": "id", "order": "DESCENDING" }
  ]
}
```

Add equivalent bounded indexes for `searchTokens` array membership and each supported primary facet with `lastActivityAt` and `id`. Add TTL field overrides for `customerMessages.expiresAt` and `intakeSessions.expiresAt`. Do not deploy the manifest in this task.

- [ ] **Step 5: Run tests and observe GREEN**

Run: `npm test -- src/lib/customer-operations/firestore-customer-operations-repository.test.ts src/lib/firebase/firestore-indexes.test.ts`

Expected: repository contract and manifest tests pass.

- [ ] **Step 6: Commit persistence**

```bash
git add src/lib/firebase/paths.ts src/lib/customer-operations/customer-operations-repository.ts src/lib/customer-operations/firestore-customer-operations-repository.ts src/lib/customer-operations/firestore-customer-operations-repository.test.ts firebase/firestore.indexes.json src/lib/firebase/firestore-indexes.test.ts
git commit -m "Add customer operations storage"
```

---

### Task 3: Projection, messages, events, and management service

**Files:**
- Create: `src/lib/customer-operations/customer-operations-service.ts`
- Create: `src/lib/customer-operations/customer-operations-service.test.ts`

**Interfaces:**
- Consumes: `CustomerOperationsRepository` and Task 1 rules.
- Produces: `recordInbound`, `createOutboundIntent`, `markOutboundSent`, `markOutboundFailed`, `updateDeliveryByProviderMessageId`, `retryOutbound`, `recordMediaReceived`, `recordDomainEvent`, `refreshActivity`, `updateManagement`, `deleteConversation`, `queryActivities`, `countActivities`, and `getCustomerDetail`.

- [ ] **Step 1: Write failing service tests**

```ts
it("stores inbound text before executing downstream processing", async () => {
  const calls: string[] = [];
  repository.saveMessage = async () => { calls.push("message"); return inboundMessage; };
  await service.recordInbound({ phone: "919876543210", workspaceId: "workspace_1", providerMessageId: "wamid.1", text: "2 BHK in Pune", receivedAt: now });
  calls.push("processing");
  expect(calls).toEqual(["message", "processing"]);
});

it("records media receipt without retaining media data", async () => {
  await service.recordMediaReceived({ phone: "919876543210", workspaceId: "workspace_1", counts: { image: 3, video: 0, document: 0 }, occurredAt: now });
  expect(repository.savedMessages).toEqual([]);
  expect(repository.savedEvents[0]).toMatchObject({ type: "media_received", label: "3 images received" });
  expect(JSON.stringify(repository.savedEvents[0])).not.toMatch(/url|mediaId|wamid/i);
});
```

Add cases for message expiry, event bodies never containing chat text, update-management validation, immediate message deletion, and effective wallet labels.

- [ ] **Step 2: Run the service test and observe RED**

Run: `npm test -- src/lib/customer-operations/customer-operations-service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement the dependency-injected service**

```ts
export class CustomerOperationsService {
  constructor(private readonly repository: CustomerOperationsRepository, private readonly now = () => new Date()) {}

  async recordInbound(input: RecordInboundInput) {
    const createdAt = input.receivedAt ?? this.now().toISOString();
    const message = await this.repository.saveMessage({
      id: input.providerMessageId,
      contactId: contactIdForPhone(input.phone),
      workspaceId: input.workspaceId,
      direction: "inbound",
      senderType: "customer",
      text: input.text.trim(),
      providerMessageId: input.providerMessageId,
      deliveryStatus: "delivered",
      createdAt,
      expiresAt: messageExpiresAt(new Date(createdAt)),
    });
    await this.repository.upsertActivity(message.contactId, { lastInboundAt: createdAt, lastActivityAt: createdAt });
    return message;
  }
}
```

`recordDomainEvent` accepts only typed labels and structured IDs; it has no message-body property. `updateManagement` trims/deduplicates tags, caps tags at 12, caps note length at 2,000 characters, validates ISO follow-up timestamps, and writes an audit event label without copying the note. `refreshActivity` takes authoritative facts as input rather than importing billing/listing services, avoiding circular dependencies. `queryActivities` and `countActivities` delegate to the repository, and `getCustomerDetail` loads one activity plus paged messages/events. Export a production singleton backed by the Firestore repository.

- [ ] **Step 4: Run the service test and observe GREEN**

Run: `npm test -- src/lib/customer-operations/customer-operations-service.test.ts`

Expected: all service tests pass.

- [ ] **Step 5: Commit orchestration**

```bash
git add src/lib/customer-operations/customer-operations-service.ts src/lib/customer-operations/customer-operations-service.test.ts
git commit -m "Add customer operations service"
```

---

### Task 4: Retain inbound and automated outbound WhatsApp text

**Files:**
- Create: `src/lib/whatsapp/whatsapp-message-sender.ts`
- Create: `src/lib/whatsapp/whatsapp-message-sender.test.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.ts`
- Modify: `src/lib/whatsapp/whatsapp-service.test.ts`
- Modify: `src/lib/whatsapp/whatsapp-intake-session-store.ts`
- Create: `src/lib/whatsapp/whatsapp-intake-session-store.test.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`
- Create: `src/app/api/whatsapp/webhook/route.test.ts`

**Interfaces:**
- Consumes: Task 3 `CustomerOperationsService`.
- Produces: `WhatsAppMessageSender.sendText`, `sendTemplate`, `retryText`, and `recordMediaSent` as the only retained outbound path.
- Produces: inbound text saved before intake processing; automated outbound intents and delivery outcomes; media-count events without chat media.

- [ ] **Step 1: Add failing inbound-order and no-media tests**

```ts
it("retains inbound text before intake mutation", async () => {
  await service.handleWebhook({ id: "wamid.1", from: "919876543210", text: "2 BHK", media: [] }, provider);
  expect(callOrder).toEqual(["retain-inbound", "append-intake"]);
});

it("does not pass inbound media fields to conversation retention", async () => {
  await service.handleWebhook({ id: "wamid.2", from: "919876543210", text: "front view", media: [{ id: "media-secret", url: "https://secret", type: "image" }] }, provider);
  expect(customerOperations.recordInbound).toHaveBeenCalledWith(expect.not.objectContaining({ media: expect.anything() }));
  expect(customerOperations.recordMediaReceived).toHaveBeenCalledWith(expect.objectContaining({ counts: { image: 1, video: 0, document: 0 } }));
});

it("scrubs the operational intake buffer after completion", async () => {
  await sessionStore.markCompleted("workspace_1", "919876543210", "listing_1");
  expect(sessionWrite()).toEqual(expect.objectContaining({ status: "completed", listingId: "listing_1", messages: [], media: [] }));
});
```

- [ ] **Step 2: Run the WhatsApp service test and observe RED**

Run: `npm test -- src/lib/whatsapp/whatsapp-service.test.ts src/lib/whatsapp/whatsapp-intake-session-store.test.ts`

Expected: FAIL because customer-operations retention is not called.

- [ ] **Step 3: Inject retention into `WhatsAppService` before dedupe/intake processing**

Add `customerOperations` to `WhatsAppServiceDependencies`. Resolve the workspace, call `recordInbound` for non-empty text/caption, call `recordMediaReceived` with counts only, then continue the existing processed-message and intake behavior. Treat the customer message record's idempotent-existing result as compatible with the existing duplicate guard.

Add an `expiresAt` timestamp 180 days after the most recent activity to the operational intake-session document. On `markCompleted` and `markCancelled`, atomically replace `messages` and `media` with empty arrays after the listing workflow no longer needs them. This prevents the intake buffer from becoming a second indefinite copy of chat text or media metadata.

- [ ] **Step 4: Add failing retained-sender and outbound route tests**

```ts
it("stores an automated outbound text intent before calling Meta", async () => {
  await sender.sendText({ phone: "919876543210", workspaceId: "workspace_1", text: "Welcome", senderType: "automation" });
  expect(callOrder).toContainEqual("save-outbound-intent");
  expect(callOrder.indexOf("save-outbound-intent")).toBeLessThan(callOrder.indexOf("provider-send"));
});

it("records outbound media only as a body-free event", async () => {
  await sender.recordMediaSent({ phone: "919876543210", workspaceId: "workspace_1", caption: "Front view", mediaType: "image", occurredAt: now });
  expect(customerOperations.createOutboundIntent).not.toHaveBeenCalledWith(expect.objectContaining({ mediaUrl: expect.anything() }));
  expect(customerOperations.recordDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "media_sent" }));
});
```

- [ ] **Step 5: Run sender and route tests and observe RED**

Run: `npm test -- src/lib/whatsapp/whatsapp-message-sender.test.ts src/app/api/whatsapp/webhook/route.test.ts`

Expected: FAIL because outbound sends bypass retention.

- [ ] **Step 6: Implement one retained outbound sender and route all webhook replies through it**

For text, `WhatsAppMessageSender` saves an outbound intent, calls the provider, then marks sent with provider ID; it catches and marks failed before rethrowing to the caller's existing boundary. `retryText` accepts only a failed outbound message and updates the same record rather than creating another conversation entry. For media, retain the caption as text only when non-empty and record a body-free `media_sent` event without URL/provider-media fields. Replace direct provider sends in the webhook route with this sender so automation follows the same path as later payment and admin sends.

- [ ] **Step 7: Run focused WhatsApp tests and observe GREEN**

Run: `npm test -- src/lib/whatsapp/whatsapp-service.test.ts src/lib/whatsapp/whatsapp-intake-session-store.test.ts src/lib/whatsapp/whatsapp-message-sender.test.ts src/app/api/whatsapp/webhook/route.test.ts`

Expected: existing intake behavior and new retention behavior pass.

- [ ] **Step 8: Commit webhook retention**

```bash
git add src/lib/whatsapp/whatsapp-message-sender.ts src/lib/whatsapp/whatsapp-message-sender.test.ts src/lib/whatsapp/whatsapp-service.ts src/lib/whatsapp/whatsapp-service.test.ts src/lib/whatsapp/whatsapp-intake-session-store.ts src/lib/whatsapp/whatsapp-intake-session-store.test.ts src/app/api/whatsapp/webhook/route.ts src/app/api/whatsapp/webhook/route.test.ts
git commit -m "Retain WhatsApp conversation text"
```

---

### Task 5: Delivery updates and safe admin replies

**Files:**
- Modify: `src/lib/whatsapp/whatsapp-provider.ts`
- Modify: `src/lib/whatsapp/providers/meta-provider.ts`
- Modify: `src/lib/whatsapp/providers/meta-provider.test.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`
- Create: `src/server-actions/customer-operations-actions.ts`
- Create: `src/server-actions/customer-operations-actions.test.ts`
- Modify: `src/lib/audit/audit-log-service.ts`
- Create: `src/lib/audit/audit-log-service.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `sendTemplateMessage(to: string, template: { name: string; languageCode: string }): Promise<{ id: string; status: "sent" | "mocked" }>`.
- Produces Server Actions: `sendCustomerReplyAction`, `sendCustomerFollowUpTemplateAction`, `retryCustomerMessageAction`, `updateCustomerManagementAction`, and `deleteCustomerConversationAction`.

- [ ] **Step 1: Write a failing Meta template payload test**

```ts
it("sends the configured approved follow-up template", async () => {
  await provider.sendTemplateMessage("919876543210", { name: "admin_follow_up", languageCode: "en" });
  expect(fetchBody()).toEqual(expect.objectContaining({ type: "template", template: { name: "admin_follow_up", language: { code: "en" } } }));
});
```

- [ ] **Step 2: Run provider tests and observe RED**

Run: `npm test -- src/lib/whatsapp/providers/meta-provider.test.ts`

Expected: FAIL because the provider interface has no template method.

- [ ] **Step 3: Implement template sending and delivery fan-out**

Add `sendTemplateMessage` to real and mock providers. In the webhook route, pass every parsed delivery status to both broker verification and `customerOperations.updateDeliveryByProviderMessageId`. Preserve the route's status-200 retry-safe failure behavior.

- [ ] **Step 4: Write failing reply/action tests**

```ts
it("allows free-form reply within 24 hours", async () => {
  now = new Date("2026-08-13T10:00:00.000Z");
  activity.lastInboundAt = "2026-08-12T10:01:00.000Z";
  await sendCustomerReplyAction("contact_1", initialState, formData({ text: "Can I help?" }));
  expect(provider.sendTextMessage).toHaveBeenCalled();
});

it("requires the approved template outside 24 hours", async () => {
  activity.lastInboundAt = "2026-08-12T09:59:59.000Z";
  const result = await sendCustomerReplyAction("contact_1", initialState, formData({ text: "Can I help?" }));
  expect(result).toEqual({ ok: false, message: "The 24-hour reply window has closed. Send the approved follow-up template instead." });
  expect(provider.sendTextMessage).not.toHaveBeenCalled();
});
```

Also test super-admin authentication, contact/workspace validation, 2,000-character reply limit, outbound intent-before-send, send failure persistence, explicit `delete` confirmation, and revalidation of `/admin/workspaces`.

- [ ] **Step 5: Run action tests and observe RED**

Run: `npm test -- src/server-actions/customer-operations-actions.test.ts`

Expected: FAIL because actions are missing.

- [ ] **Step 6: Implement authenticated actions**

```ts
type ActionState = { ok: boolean; message: string };

export async function sendCustomerReplyAction(contactId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getCurrentAdmin();
  const detail = await customerOperations.getCustomerDetail(contactId);
  if (!detail || detail.activity.workspaceId !== String(formData.get("workspaceId"))) return { ok: false, message: "Customer record does not match this workspace." };
  const text = String(formData.get("text") ?? "").trim();
  if (!text || text.length > 2000) return { ok: false, message: "Reply must be between 1 and 2,000 characters." };
  return sendWithinWindowOrExplain({ admin, detail, text });
}
```

Use `WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_NAME` and `WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_LANGUAGE`; do not silently fall back to free-form text when missing. All mutations call `getCurrentAdmin`, validate record relationships, add body-free audit events, and `revalidatePath("/admin/workspaces")`.

`sendCustomerFollowUpTemplateAction` rejects a missing template configuration and delegates to the retained sender. `retryCustomerMessageAction` validates that the message belongs to the selected contact, is outbound, and is failed before delegating to `retryText`; it updates the same conversation record. Add `AuditLogService.record({ workspaceId, actorId, action, targetId })`; the record contains no chat text or private note body.

- [ ] **Step 7: Run focused tests and observe GREEN**

Run: `npm test -- src/lib/whatsapp/providers/meta-provider.test.ts src/lib/whatsapp/whatsapp-message-sender.test.ts src/app/api/whatsapp/webhook/route.test.ts src/server-actions/customer-operations-actions.test.ts src/lib/audit/audit-log-service.test.ts`

Expected: template, delivery, reply-window, validation, and deletion tests pass.

- [ ] **Step 8: Commit replies and delivery tracking**

```bash
git add src/lib/whatsapp/whatsapp-provider.ts src/lib/whatsapp/providers/meta-provider.ts src/lib/whatsapp/providers/meta-provider.test.ts src/app/api/whatsapp/webhook/route.ts src/server-actions/customer-operations-actions.ts src/server-actions/customer-operations-actions.test.ts src/lib/audit/audit-log-service.ts src/lib/audit/audit-log-service.test.ts .env.example
git commit -m "Add safe admin WhatsApp replies"
```

---

### Task 6: Domain outcome projection hooks

**Files:**
- Modify: `src/lib/billing/payment-service.ts`
- Modify: `src/lib/billing/payment-service.test.ts`
- Modify: `src/server-actions/listing-actions.ts`
- Modify: `src/server-actions/listing-actions.test.ts`
- Modify: `src/lib/claims/broker-verification-service.ts`
- Create: `src/lib/claims/broker-verification-service.test.ts`
- Modify: `src/server-actions/billing-actions.ts`
- Create: `src/server-actions/billing-actions.test.ts`
- Modify: `src/server-actions/credit-actions.ts`
- Modify: `src/server-actions/credit-actions.test.ts`

**Interfaces:**
- Consumes: Task 3 `recordDomainEvent` and `refreshActivity`.
- Produces: current payment, listing, claim, plan, and credit summaries in the activity projection.

- [ ] **Step 1: Add failing payment outcome and activation-message tests**

```ts
it("projects paid purchase only after credits and workspace plan succeed", async () => {
  await service.verifyCheckout(validVerification);
  expect(customerOperations.recordDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "purchase_paid", workspaceId: "workspace_1" }));
  expect(customerOperations.refreshActivity).toHaveBeenCalledWith(expect.objectContaining({ latestPaymentState: "paid", planId: "growth" }));
});

it("sends the activation message through retained WhatsApp delivery", async () => {
  await service.verifyCheckout(validActivationVerification);
  expect(whatsAppMessageSender.sendText).toHaveBeenCalledWith(expect.objectContaining({ senderType: "automation", workspaceId: "workspace_1" }));
});
```

Add failed/refunded/pending cases and assert retries do not duplicate events.

- [ ] **Step 2: Run payment tests and observe RED**

Run: `npm test -- src/lib/billing/payment-service.test.ts`

Expected: FAIL because payment outcomes do not update customer operations.

- [ ] **Step 3: Inject a narrow customer-operations dependency into `PaymentService`**

Call the dependency after authoritative purchase state changes. Use purchase ID as the operational-event idempotency source. Replace the payment service's direct provider activation send with Task 4 `WhatsAppMessageSender`. Projection/retention failures are logged and retryable, but must not replay or roll back a captured payment or credit grant.

- [ ] **Step 4: Add failing listing, claim, plan, and grant tests**

Assert that ready/published/archived status changes refresh counts, successful broker verification classifies as customer, plan assignment updates plan summary, and promotional grant refreshes effective wallet state. Assert audit events contain labels and IDs but not notes or chat text.

- [ ] **Step 5: Run focused domain tests and observe RED**

Run: `npm test -- src/server-actions/listing-actions.test.ts src/server-actions/billing-actions.test.ts src/server-actions/credit-actions.test.ts src/lib/claims/broker-verification-service.test.ts src/lib/billing/payment-service.test.ts`

Expected: new projection assertions fail.

- [ ] **Step 6: Add post-success projection/event calls at each outer mutation boundary**

Use an injected or imported customer-operations service only at orchestration boundaries. Do not make the projection authoritative and do not move existing billing/listing transactions. For claims, emit `account_claimed`; for credits, call `creditWalletService.getWallet` after the grant and use its effective balance.

- [ ] **Step 7: Run focused domain tests and observe GREEN**

Run: `npm test -- src/lib/billing/payment-service.test.ts src/server-actions/listing-actions.test.ts src/server-actions/billing-actions.test.ts src/server-actions/credit-actions.test.ts src/lib/claims/broker-verification-service.test.ts`

Expected: existing domain behavior and projection hooks pass.

- [ ] **Step 8: Commit domain hooks**

```bash
git add src/lib/billing/payment-service.ts src/lib/billing/payment-service.test.ts src/server-actions/listing-actions.ts src/server-actions/listing-actions.test.ts src/lib/claims/broker-verification-service.ts src/lib/claims/broker-verification-service.test.ts src/server-actions/billing-actions.ts src/server-actions/billing-actions.test.ts src/server-actions/credit-actions.ts src/server-actions/credit-actions.test.ts
git commit -m "Project customer lifecycle outcomes"
```

---

### Task 7: Safe existing-data backfill

**Files:**
- Create: `src/lib/customer-operations/customer-backfill.ts`
- Create: `src/lib/customer-operations/customer-backfill.test.ts`
- Create: `scripts/backfill-customer-activity.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `CustomerBackfill.run({ apply: boolean }): Promise<BackfillReport>`.
- Produces npm command: `npm run customer-operations:backfill -- [--apply]`.

- [ ] **Step 1: Write failing dry-run and idempotency tests**

```ts
it("does not write in dry-run mode", async () => {
  const report = await backfill.run({ apply: false });
  expect(report.scanned).toBe(2);
  expect(repository.upsertActivity).not.toHaveBeenCalled();
});

it("produces the same projection when applied twice", async () => {
  await backfill.run({ apply: true });
  const first = repository.snapshot();
  await backfill.run({ apply: true });
  expect(repository.snapshot()).toEqual(first);
});
```

Assert the backfill never calls workspace-plan, purchase, wallet, listing-status, or auth mutation methods and marks chat completeness with `historyRetainedFrom` rather than inventing old messages.

- [ ] **Step 2: Run the backfill test and observe RED**

Run: `npm test -- src/lib/customer-operations/customer-backfill.test.ts`

Expected: FAIL because backfill does not exist.

- [ ] **Step 3: Implement batched authoritative reads and dry-run CLI**

Read workspaces, authenticated users, purchases, effective wallets, listings, and current intake sessions. Group by normalized phone/workspace, derive projection inputs through Task 1 functions, and upsert only when `apply` is true. Print counts for scanned, would-create, would-update, unchanged, skipped-no-phone, and errors; exit nonzero when errors are nonempty.

```json
"customer-operations:backfill": "tsx scripts/backfill-customer-activity.ts"
```

- [ ] **Step 4: Run tests and a local dry-run**

Run: `npm test -- src/lib/customer-operations/customer-backfill.test.ts`

Run: `npm run customer-operations:backfill`

Expected: tests pass; CLI prints a report and performs zero writes.

- [ ] **Step 5: Commit backfill tooling**

```bash
git add src/lib/customer-operations/customer-backfill.ts src/lib/customer-operations/customer-backfill.test.ts scripts/backfill-customer-activity.ts package.json
git commit -m "Add customer activity backfill"
```

---

### Task 8: Paginated directory table

**Files:**
- Create: `src/lib/customer-operations/customer-directory-model.ts`
- Create: `src/lib/customer-operations/customer-directory-model.test.ts`
- Create: `src/components/admin/customer-directory.tsx`
- Modify: `src/app/admin/workspaces/page.tsx`

**Interfaces:**
- Consumes: repository `queryActivities` and `countActivities`.
- Produces: validated `parseDirectoryQuery(searchParams)` and the Customers/Prospects/All table.

- [ ] **Step 1: Write failing URL-query and row-model tests**

```ts
it("defaults to customers, newest activity, and 25 rows", () => {
  expect(parseDirectoryQuery({})).toMatchObject({ tab: "customers", sort: "last_activity_desc", pageSize: 25, cursor: null });
});

it("rejects malformed cursor and unknown filters", () => {
  expect(parseDirectoryQuery({ cursor: "not-a-cursor", stage: "bogus" })).toMatchObject({ cursor: null, filters: {} });
});

it("explains wallet states without saying no wallet", () => {
  expect(toDirectoryRow(activityNeverFunded).creditsLabel).toBe("Never funded");
});
```

- [ ] **Step 2: Run model tests and observe RED**

Run: `npm test -- src/lib/customer-operations/customer-directory-model.test.ts`

Expected: FAIL because query/model helpers are missing.

- [ ] **Step 3: Implement validated query parsing and display helpers**

Allow only declared tab, stage, payment, wallet, follow-up, plan, and sort values. Normalize search into one Task 1 search token. Preserve filters in generated tab, filter, Previous, Next, and selected-contact URLs.

- [ ] **Step 4: Run model tests and observe GREEN**

Run: `npm test -- src/lib/customer-operations/customer-directory-model.test.ts`

Expected: query/model tests pass.

- [ ] **Step 5: Replace repeated cards with the server-rendered directory**

```tsx
export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await getCurrentAdmin();
  const query = parseDirectoryQuery(await searchParams);
  const [page, counts] = await Promise.all([
    customerOperations.queryActivities(query),
    customerOperations.countActivities(),
  ]);
  return <AdminSectionPage active="Workspaces" title="Customer operations" description="Track customers, prospects, payments, listings, credits and follow-ups." cards={summaryCards(counts)}><CustomerDirectory query={query} page={page} counts={counts} /></AdminSectionPage>;
}
```

Render a horizontally scrollable semantic table with the approved columns, exact date/time tooltips, accessible filter labels, 25-row pagination, and clear unfiltered-empty, filtered-empty, and failure states. Use links/forms for URL state so the page remains a Server Component.

- [ ] **Step 6: Run focused tests, lint the touched files, and build the route**

Run: `npm test -- src/lib/customer-operations/customer-directory-model.test.ts`

Run: `npx eslint src/app/admin/workspaces/page.tsx src/components/admin/customer-directory.tsx src/lib/customer-operations/customer-directory-model.ts`

Run: `npm run build`

Expected: focused tests, lint, TypeScript, and Next.js production build pass.

- [ ] **Step 7: Commit the directory**

```bash
git add src/lib/customer-operations/customer-directory-model.ts src/lib/customer-operations/customer-directory-model.test.ts src/components/admin/customer-directory.tsx src/app/admin/workspaces/page.tsx
git commit -m "Add customer operations directory"
```

---

### Task 9: Detail drawer, conversation, and management controls

**Files:**
- Create: `src/components/admin/customer-detail-drawer.tsx`
- Create: `src/components/admin/customer-conversation.tsx`
- Modify: `src/components/admin/customer-directory.tsx`
- Modify: `src/app/admin/workspaces/page.tsx`
- Modify: `src/server-actions/customer-operations-actions.test.ts`

**Interfaces:**
- Consumes: Task 3 customer detail and Task 5 actions.
- Produces: Overview, Conversation, Activity, and Manage tabs for `contact=<id>`.

- [ ] **Step 1: Add failing detail-presentation tests**

Extend `customer-directory-model.test.ts` with serializable detail-model assertions:

```ts
it("shows the retention boundary and text-only messages", () => {
  const model = toCustomerDetailModel(detail);
  expect(model.retentionLabel).toBe("History retained from 13 Aug 2026");
  expect(model.messages[0]).toEqual(expect.objectContaining({ text: "Need help paying", deliveryLabel: "Read" }));
  expect(JSON.stringify(model.messages)).not.toMatch(/mediaUrl|providerMediaId/);
});
```

- [ ] **Step 2: Run the model test and observe RED**

Run: `npm test -- src/lib/customer-operations/customer-directory-model.test.ts`

Expected: FAIL because the detail model is missing.

- [ ] **Step 3: Implement the serializable detail model and components**

Keep `page.tsx` as the authenticated Server Component that loads detail for the selected contact. Pass plain serializable objects into the narrow `"use client"` drawer. Use the existing Sheet and Tabs primitives for open state and tab switching. Close by navigating to the same query without `contact`.

Conversation renders inbound/outbound text bubbles, automation/admin labels, exact timestamps, and sent/delivered/read/failed states. Failed outbound messages show a Retry action that updates the same record. Media-count operational events appear in Activity, not as chat attachments. The composer uses `useActionState`; outside 24 hours it offers the approved template action or a clear configuration blocker.

Manage renders private note, tags, follow-up timestamp, open/resolved state, plan assignment, and promotional credit forms. Reuse existing plan/credit Server Actions after their Task 6 projection hooks rather than duplicating billing logic. Conversation deletion requires typing `delete`.

- [ ] **Step 4: Run focused tests and lint**

Run: `npm test -- src/lib/customer-operations/customer-directory-model.test.ts src/server-actions/customer-operations-actions.test.ts`

Run: `npx eslint src/app/admin/workspaces/page.tsx src/components/admin/customer-directory.tsx src/components/admin/customer-detail-drawer.tsx src/components/admin/customer-conversation.tsx`

Expected: tests and lint pass without client/server boundary errors.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: Next.js builds `/admin/workspaces`; no `useSearchParams` Suspense error occurs because the Server Component page consumes `searchParams`.

- [ ] **Step 6: Commit the drawer**

```bash
git add src/components/admin/customer-detail-drawer.tsx src/components/admin/customer-conversation.tsx src/components/admin/customer-directory.tsx src/app/admin/workspaces/page.tsx src/server-actions/customer-operations-actions.test.ts
git commit -m "Add customer management drawer"
```

---

### Task 10: Full verification and production-release checkpoint

**Files:**
- Review all files changed by Tasks 1–9.
- No production deployment in this task.

**Interfaces:**
- Produces: locally verified release candidate, dry-run backfill report, index/TTL deployment checklist, and documented residual risks.

- [ ] **Step 1: Run all customer-operations and integration tests**

Run: `npm test -- src/lib/customer-operations src/lib/whatsapp src/lib/billing/payment-service.test.ts src/server-actions/customer-operations-actions.test.ts src/server-actions/listing-actions.test.ts src/server-actions/credit-actions.test.ts src/app/api/whatsapp/webhook/route.test.ts src/lib/firebase/firestore-indexes.test.ts`

Expected: all focused tests pass with zero failures.

- [ ] **Step 2: Run the complete repository gate**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: full tests, ESLint, Next.js/TypeScript production build, and whitespace validation pass.

- [ ] **Step 3: Run backfill in dry-run mode only**

Run: `npm run customer-operations:backfill`

Expected: report shows scanned/would-create/would-update/skipped/errors and confirms `apply=false`; no Firestore writes occur.

- [ ] **Step 4: Inspect release scope**

Run: `git status --short --branch`

Run: `git diff --stat origin/main...HEAD`

Run: `git log --oneline origin/main..HEAD`

Expected: only approved customer-operations, WhatsApp retention, index manifest, backfill, admin UI, tests, and documentation changes are present.

- [ ] **Step 5: Stop for production approval**

Report:

- files and behavior changed
- focused/full test counts
- dry-run backfill counts and errors
- required Firestore index and TTL deployment
- required Meta follow-up template configuration/approval
- that pre-launch overwritten chats cannot be recovered
- that chat records contain no retained media fields

Do not deploy indexes, enable TTL, run `--apply`, push, or deploy Vercel until the user explicitly approves the production sequence.
