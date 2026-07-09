# Listing Credit Pricing And Razorpay Design

## Goal

Sell fixed listing-credit packages without recurring subscriptions. Public pricing, dashboard usage, WhatsApp limits, and checkout must all use the same plans managed by the super admin.

## Commercial Model

- A package contains a fixed number of listing credits.
- Package credits are available for 30 days after purchase.
- Publishing a new listing consumes one credit permanently.
- Drafting does not consume a credit.
- Archiving, marking sold or rented, unpublishing, or deleting never refunds a credit.
- Buying another package adds its credits to the unused balance and extends the wallet validity to 30 days from the new purchase.
- A published listing remains public for 60 days from its first publication.
- After 60 days, the listing remains saved but requires reactivation.
- Reactivation does not consume a credit, but requires an active package.
- Free onboarding uses the same wallet model without a payment.

## Plan Builder

The super-admin plan builder is the source of truth for public pricing and payment options. Each active plan stores:

- Name and public description.
- Price in paise and display currency.
- Listing-credit quantity.
- Credit validity in days, initially 30.
- Listing visibility in days, initially 60.
- Status and display order.
- Optional featured-plan flag.

Prices must be numeric in storage. Display labels are derived from the amount and currency so checkout and public pricing cannot disagree.

## Public Pricing

- The homepage renders active plans directly from Firestore in configured order.
- Each card shows price, included listing credits, 30-day credit validity, and 60-day listing visibility.
- Free plans show a start action without Razorpay.
- Paid plans use a package-specific purchase URL.
- Signed-out users authenticate before checkout and return to the selected package.
- Signed-in brokers proceed directly to checkout.

## Credit Wallet

Each workspace has one billing wallet containing:

- Available credits.
- Wallet validity timestamp.
- Current eligibility for free reactivation.
- Last purchase reference.

A credit ledger records every grant and consumption. Ledger entries are immutable and include the workspace, source plan, purchase, listing, quantity, reason, and timestamp. Listing records store their original credit-consumption reference so retries cannot consume twice.

## Razorpay Checkout

TRL uses Razorpay Orders for one-time package purchases, not Razorpay Subscriptions.

1. The broker opens a signed package-specific purchase URL.
2. The server resolves the authenticated workspace and active plan.
3. The server creates an internal pending purchase and a Razorpay Order using the plan's numeric price.
4. The client opens Razorpay Checkout.
5. The server verifies the payment signature.
6. A verified payment marks the purchase paid and grants credits exactly once.
7. The broker returns to a success page showing the updated balance.

The client never grants credits. Purchase completion is idempotent across checkout callbacks and webhooks.

## Webhooks And Reconciliation

- Verify every Razorpay webhook signature.
- Reconcile paid, failed, and refunded payments.
- Ignore duplicate events safely.
- Record provider order, payment, event, and refund identifiers.
- Flag refunds for admin review; do not silently create a negative balance when credits have already been consumed.
- Preserve an audit trail for manual support.

## WhatsApp Purchase Flow

After each successful publication, WhatsApp reports the remaining credit balance.

When no credit is available:

- Do not publish or consume the intake.
- Keep the gathered property details and images available for retry.
- Send a concise limit message.
- List every active paid package with its listing count, price, and a direct `Buy now` URL.
- Each URL is signed, identifies the intended workspace and plan, expires, and still requires broker authentication before payment.
- After verified payment, the broker can return to WhatsApp and type `DONE` to publish the retained intake.

The same purchase options appear when the wallet has expired.

## Listing Lifecycle

- `draft`: no credit consumed.
- `published`: one credit consumed on first publication; public for 60 days.
- `sold`, `rented`, `archived`: saved and not public; no credit refund.
- `expired`: saved and not public after visibility ends.
- `reactivated`: public again without another credit while the wallet is active.

Reactivation resets the listing visibility window to 60 days.

## Scheduled Expiry

A protected scheduled job finds published listings whose visibility has ended and marks them expired. The operation is idempotent and records the transition in the audit log.

## Security

- Resolve prices and plan details on the server.
- Never trust a plan amount, workspace ID, or credit quantity supplied by the browser.
- Bind purchase links to a workspace and plan using short-lived signed tokens.
- Require authenticated workspace membership before creating an order.
- Verify Razorpay checkout and webhook signatures.
- Use idempotency keys for order creation, payment completion, credit grants, and listing consumption.
- Rate-limit order creation and purchase-link generation.

## Admin And Broker Experience

Super admin can:

- Create, edit, order, feature, activate, and retire packages.
- Assign free or promotional credits.
- Inspect purchases, payment state, balances, ledger entries, and listing expiry.

Broker dashboard shows:

- Credits remaining and wallet expiry.
- Listing publication and expiry dates.
- Package purchase actions.
- Reactivation controls for eligible expired listings.
- Clear sold, rented, archived, and expired states.

## Migration

- Existing plans are migrated from display-only prices to numeric INR amounts.
- Existing workspaces receive an initial wallet matching their current plan allowance.
- Existing published listings receive a 60-day visibility end based on their publication timestamp, with a safe migration date fallback.
- Existing listing credits are marked consumed so old listings cannot refund or consume credits again.

## Testing

- Plan parsing and numeric pricing.
- Credit grants, carry-forward, expiry, consumption, and idempotency.
- No refunds from archive, sold, rented, unpublish, or delete.
- Free reactivation only with an active wallet.
- Listing expiry job.
- Signed purchase-link validation and expiry.
- Razorpay callback and webhook signature verification.
- Duplicate payment and webhook delivery.
- WhatsApp zero-credit and payment-link messages.
- Public pricing data matches the admin plan builder.
- End-to-end checkout in Razorpay test mode.

## Delivery Phases

1. Plan schema, wallet, ledger, migration, and enforcement.
2. Public pricing and broker usage interface.
3. Razorpay Orders, checkout, callbacks, webhooks, and reconciliation.
4. WhatsApp direct purchase links and retained-intake retry.
5. Scheduled listing expiry, reactivation, and operational monitoring.
