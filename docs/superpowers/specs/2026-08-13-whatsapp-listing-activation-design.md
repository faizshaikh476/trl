# WhatsApp Listing Activation Design

## Goal

Remove purchase friction when a broker finishes a WhatsApp intake without usable listing credits. Save the listing, send a secure listing-specific checkout link, and automatically publish that listing after verified payment without requiring login or another WhatsApp command.

## User Flow

1. The broker sends listing details and `DONE` in WhatsApp.
2. The intake is validated and extracted even when the workspace has no usable credits.
3. The listing is saved as `ready_to_publish` without consuming a credit or creating a public listing entry.
4. WhatsApp sends a short-lived signed activation URL bound to the workspace and listing.
5. The activation page shows the saved listing summary and active paid credit packages without requiring login.
6. The broker selects a package and completes Razorpay checkout.
7. Verified payment grants the purchased credits, consumes one credit for the bound listing, and publishes it automatically.
8. The success page links directly to the live listing. A WhatsApp confirmation is attempted as a best-effort notification.

Existing behavior remains unchanged when the workspace already has usable credits: `DONE` publishes immediately.

## Authorization and Data Boundaries

The activation token contains `workspaceId`, `listingId`, and `expiresAt`, protected by the existing purchase-link HMAC secret. It is valid for 24 hours. Verification rejects malformed, expired, tampered, cross-workspace, or wrong-listing tokens.

Unauthenticated order creation is allowed only when a valid activation token identifies a listing that belongs to the token workspace and is still awaiting publication. Ordinary pricing and dashboard purchases continue to require an authenticated workspace.

The purchase record stores the activation target and WhatsApp recipient. A purchase can activate only its stored target. This prevents browser parameters or later requests from redirecting a paid purchase to another listing.

## Listing Creation

The listing service gains an explicit path for creating a WhatsApp-extracted listing without publication. The repository stores it as `ready_to_publish` with null publication, expiry, and credit-consumption fields and does not create a public slug lookup entry.

The WhatsApp service uses the existing immediate-publication path when billing permits publication. When billing rejects for no active credits, it continues processing the valid session through extraction and media persistence, uses the unpublished creation path, completes the intake session with the saved listing ID, and returns the activation link.

## Payment Completion

Activation completion is shared by checkout verification and Razorpay webhook processing:

1. Mark the purchase paid idempotently.
2. Grant credits idempotently through the deterministic purchase ledger entry.
3. Load and validate the stored activation listing.
4. Publish it through the existing listing service so one credit is consumed and normal visibility dates and public lookup data are created.
5. Persist activation completion metadata on the purchase.
6. Revalidate the public listing.

If browser verification and webhook delivery race or retry, an already-published or already-completed target returns successfully without another credit consumption.

If credit granting succeeds but publication encounters an unexpected error, the credits remain available, the listing remains saved, and activation stays pending for a later retry. The payment is never repeated and no extra credit is consumed.

## Checkout and Success UI

The activation page is server-rendered from the verified token. It displays the saved listing title/location and active paid packages. Checkout requests carry the activation token through order creation and verification.

For activation purchases, the success page reads the purchase outcome and shows either:

- `Listing activated` with the public listing link; or
- `Payment received — activation pending` when payment succeeded but publication needs retry.

Normal purchases keep the existing `Credits added` success state.

## WhatsApp Notification

After activation completes, the system attempts to send a short confirmation with the public listing URL using the configured WhatsApp provider. Notification is best-effort: provider rejection, including Meta customer-service-window restrictions, is logged but cannot roll back payment, credits, or publication.

## Testing

Focused tests cover:

- no-credit WhatsApp intake is extracted, saved as `ready_to_publish`, and returns one listing-specific activation link;
- activation token validity, expiry, tampering, workspace binding, and listing binding;
- unauthenticated activation checkout requires a valid token while ordinary checkout still requires login;
- verified payment grants credits and publishes exactly the stored listing;
- browser verification and webhook retries publish once and consume one credit;
- publication failure after credit grant remains recoverable without another payment;
- activation success and pending UI states;
- existing authenticated purchases and immediate WhatsApp publication remain unchanged.

Only focused tests and `git diff --check` will be run. No commit, push, production deployment, branch switch, reset, clean, or revert will be performed.
