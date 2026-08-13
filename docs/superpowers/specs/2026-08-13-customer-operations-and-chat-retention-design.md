# Customer Operations and WhatsApp Chat Retention

## Objective

Replace the unbounded admin workspace cards with a scalable customer operations directory that explains each person's journey, supports follow-up, and retains enough WhatsApp text history to diagnose abandonment without retaining chat media.

The feature is for one platform administrator. Staff assignment, team inbox queues, and multi-agent support workflows are out of scope.

## Outcomes

- Display customers and prospects in a compact, searchable, filterable table.
- Order results deterministically, newest activity first by default.
- Paginate on the server with 25 rows per page.
- Explain account, payment, listing, and wallet state in plain language.
- Retain inbound and outbound WhatsApp text for 180 days.
- Allow the administrator to reply from the selected person's conversation.
- Keep operational events after chat text expires.
- Provide notes, tags, follow-up dates, and open/resolved status.

## Selected Architecture

Use a denormalized customer activity index for table queries, backed by separate immutable message and operational-event records.

This avoids deriving every row by reading all workspaces and their wallet, purchase, listing, and WhatsApp subcollections on each page request. A fully event-sourced CRM is intentionally out of scope.

### Customer activity record

One activity record is keyed by normalized WhatsApp phone number. It links to a workspace and authenticated user when those records exist.

The record contains:

- normalized and display phone
- display name, email, and city when known
- normalized exact and prefix search tokens for names, phones, emails, workspace IDs, and payment identifiers
- workspace ID and authenticated user ID when known
- classification: `customer` or `prospect`
- journey stage
- plan and latest payment summary
- effective usable credit balance and wallet state
- total, ready-to-publish, and published listing counts
- first-seen and last-activity timestamps
- last inbound and outbound timestamps
- short body-free latest activity label
- tags, private note, follow-up date, and open/resolved state

This record is a projection for operations, not the source of truth for billing, listings, authentication, or message history. Domain services remain authoritative and update the projection after successful domain changes.

### Classification

A person is a `customer` after either:

- a successful paid purchase, or
- a claimed/authenticated broker account.

A WhatsApp contact with neither is a `prospect` even though the current intake flow automatically creates a workspace on first contact. Workspace existence alone never makes a person a customer.

### Journey stages

The projection exposes one current stage:

- `new_chat`: contacted the WhatsApp number but did not start a listing
- `listing_started`: has an incomplete or in-progress intake
- `ready_to_publish`: has a saved listing awaiting activation
- `payment_pending`: has an open purchase attempt or activation checkout
- `payment_failed`: the latest relevant checkout failed
- `customer`: has a claimed account or successful purchase with no higher-priority issue
- `needs_attention`: an explicit operational failure or overdue follow-up requires review

Stage calculation is centralized and tested. `needs_attention`, payment failure, and payment pending take precedence over ordinary progress stages. Resolved status hides the attention indicator but does not delete history.

### Wallet language

The UI never shows the ambiguous label `No wallet`. It derives one of:

- `Never funded`: no completed purchase or credit grant exists
- `Expired`: a wallet exists but `validUntil` has passed
- `0 remaining`: a valid wallet exists and all usable credits were consumed
- `Active · N credits`: a valid wallet has an effective usable balance

The credit wallet service remains authoritative for effective balance and expiry.

## WhatsApp History

### Message retention

Retain inbound and outbound text records for 180 days. Each record contains:

- direction and sender type (`customer`, `automation`, or `admin`)
- text body or text caption
- normalized phone and workspace link
- provider message ID when available
- created timestamp
- sent, delivered, read, or failed delivery state
- failure summary when applicable
- related operational event or listing ID when applicable
- an expiry timestamp exactly 180 days after creation

Provider message IDs enforce idempotency across webhook retries.

### No chat media retention

Conversation records must not store:

- image, video, or document binaries
- chat media URLs
- provider media IDs
- copied listing media references

The body-free operational timeline may record a count and type such as `3 images received`, plus the resulting listing ID if one was created. Property media required by a listing remains governed by the existing listing media system and is not duplicated into chat history.

### Operational events

Body-free events do not expire with chat messages. Examples include:

- first contact received
- listing intake started or completed
- listing saved or published
- activation link sent or opened when observable
- checkout created, paid, failed, or refunded
- wallet funded, consumed, or expired
- account claimed
- follow-up scheduled or resolved
- admin note, tag, plan, credit, or status change

These events must not copy customer message text.

### Deletion

Firestore TTL removes expired message records using their expiry timestamp. The admin drawer also provides an immediate `Delete conversation` action that deletes retained message records for that person after explicit confirmation. Operational events remain.

The UI states `History retained from <launch date>` and does not imply that overwritten pre-launch conversations were recovered.

## Admin Experience

### Directory

The Workspaces page becomes a customer operations directory with three tabs:

- `Customers`
- `Prospects`
- `All`

The default sort is last activity descending with a stable record-ID tie-breaker. Additional sorts are newest contact, latest purchase, and oldest due follow-up.

Search covers name, phone, email, workspace, purchase ID, provider order ID, and provider payment ID. Firestore does not provide general substring search, so the projection stores normalized exact identifiers and bounded word prefixes; the UI describes search as name/phone/ID lookup rather than arbitrary text search. Filters cover journey stage, plan, payment state, wallet state, and follow-up status.

Cursor-based server pagination returns 25 rows per page with Previous and Next navigation. Query parameters preserve the selected tab, search, filters, sort, cursor, and selected person.

Columns are:

- Person
- Journey
- Payment
- Listings
- Credits
- Last activity
- Follow-up
- Action

The table provides explicit empty, loading, filtered-empty, and query-failure states.

### Detail drawer

Selecting a row opens a large drawer without replacing the directory. It contains:

- `Overview`: identity, classification reason, account state, plan, wallet, listings, and latest payment
- `Conversation`: retained text thread, media-count event markers, delivery states, and reply composer
- `Activity`: body-free chronological business events
- `Manage`: note, tags, follow-up date, open/resolved state, plan assignment, promotional credits, and existing suspension controls where supported

Existing plan and promotional-credit operations move into the drawer instead of repeating large forms for every row.

### Direct replies

Inside Meta's 24-hour customer-service window, measured from the latest inbound customer message, the administrator may send a free-form text reply. Outside that window, the free-form composer is disabled and the UI offers an approved follow-up template. If no approved template is configured, the UI explains the blocker and does not claim a message was sent.

An outbound message intent is saved before the provider call, then marked sent or failed. Delivery webhooks subsequently update it to delivered, read, or failed. Failed messages stay visible and may be retried without creating duplicates.

The first version sends text only; admin media sending is out of scope.

## Data Flow and Reliability

### Inbound

1. Resolve the normalized phone and workspace.
2. Persist the inbound text idempotently before intake processing.
3. Record the first-contact or message-received operational event without copying the body.
4. Run the existing intake workflow.
5. Update domain records and then refresh the customer activity projection.
6. Persist each automated outbound text before sending and update its provider status afterward.

A failure in AI extraction, listing creation, billing, or projection refresh must not remove the retained inbound message. Projection refresh is retryable from authoritative domain data.

### Payments, listings, claims, and wallet changes

After an authoritative domain operation succeeds, publish the corresponding body-free event and refresh the affected projection. A projection failure must be logged and retryable without replaying the domain mutation.

### Admin actions

Every management mutation requires an authenticated platform admin, validates the selected phone/workspace relationship, updates the authoritative record first, and records an audit log. Destructive chat deletion requires explicit confirmation.

## Backfill and Rollout

Roll out in this order:

1. Deploy text retention and operational-event writes.
2. Deploy activity projection updates from WhatsApp and domain operations.
3. Backfill activity records from existing workspaces, authenticated users, purchases, wallets, listings, and the latest retained intake session.
4. Verify index counts and representative customer journeys.
5. Replace the card UI with the directory and detail drawer.
6. Enable admin replies after retained conversations and delivery updates are verified.

Backfill is idempotent and never changes plan assignments, balances, purchase status, listing status, or authentication. It cannot reconstruct prior overwritten chat sessions.

Required Firestore composite indexes and TTL configuration are defined alongside the implementation and deployed before UI queries depend on them.

## Testing Strategy

Implementation follows test-driven development. Focused tests cover:

- deterministic newest-first sorting and stable cursor pagination
- search and filter query normalization
- customer versus prospect classification
- journey-stage precedence
- all four wallet labels using effective usable balance
- inbound persistence before processing
- outbound intent, send failure, retry, and delivery transitions
- provider message idempotency
- exact 180-day expiry timestamps
- manual conversation deletion
- proof that chat records contain no media IDs, URLs, or binaries
- body-free operational events
- projection updates after WhatsApp, payment, listing, claim, wallet, and admin actions
- idempotent backfill that does not mutate authoritative domain data
- reply authorization and customer-service-window enforcement
- authenticated admin mutations and destructive-action confirmation

Run focused unit and integration tests throughout, then the existing relevant billing, listing, WhatsApp, and admin suites, lint, production build, and `git diff --check` before release.

## Explicit Non-goals

- Recovering overwritten historical chats
- Retaining chat media
- Sending media from the admin
- Staff assignment or a multi-agent support inbox
- Replacing authoritative billing, listing, workspace, or authentication models
- A general-purpose CRM or marketing automation system
