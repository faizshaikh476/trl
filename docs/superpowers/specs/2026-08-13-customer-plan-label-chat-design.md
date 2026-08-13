# Customer Plan Label and Direct Chat Design

## Goal

Show customer-facing plan names instead of internal plan IDs and make the retained WhatsApp conversation reachable in one click from the customer directory.

## Data and display

Customer activity continues to store the stable `planId`. The admin page loads the plan catalogue with the directory data and supplies an `id -> name` lookup to the directory view. Known IDs display their catalogue name; unknown historical IDs fall back to the current title-cased value. No payment, wallet, workspace, or customer-activity record is rewritten.

## Direct chat

Each directory row gains a Chat action. Its URL preserves the current filters, selects the customer, and requests the Conversation tab. The existing customer drawer accepts `initialTab="conversation"` and renders the existing retained-message composer. Normal name selection continues to open Overview.

## WhatsApp rules

The existing conversation behavior remains authoritative: free-form replies are available only inside the 24-hour customer-service window; otherwise the approved follow-up-template action is shown. Messages remain text-only under the 180-day retention policy.

## Verification

- A model test proves internal ID `hyper` displays as catalogue name `Starter`.
- A URL-model test proves Chat preserves filters and requests Conversation.
- Focused tests, full tests, lint, production build, and `git diff --check` run before deployment.
- Production verification checks Monesh displays Starter and Chat opens Conversation.

