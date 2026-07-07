# Owner Property Unlock Design

## Goal

After WhatsApp creates a listing, the broker/seller should see the actual property page immediately. Verification should happen as a modal on that page, only once, and successful verification should unlock the broker's normal listing workflow without sending them to a separate "ownership verified" dead-end page.

## Flow

1. WhatsApp draft creation publishes the listing immediately and returns one link:
   - Shareable public property link: `/l/{slug}`
2. `/l/{slug}` is the canonical public link and can be shared directly by the broker.
3. If the logged-in broker belongs to that listing workspace and the listing has a pending verification token, the property page opens with a verification modal.
4. The modal shows the phone number from WhatsApp as prefilled and locked.
5. The broker enters name, occupation, and email, then confirms they are authorised to list/sell the property.
6. Submit marks the claim token as claimed, marks the listing as verified, and redirects back to `/l/{slug}`.
7. Verification can happen only once. Already claimed links do not show the modal again.

## Login

There is no separate property-owner role. The broker logs in with the existing broker account. After login, opening the same property URL shows the verification modal if verification is still pending.

## Public Sharing

The public property URL is the canonical link. Metadata should include property title, description, price/location copy, and the first uploaded image when available so WhatsApp and social previews look useful.

## Editing

After verification, edit controls can be shown when the logged-in broker belongs to the listing workspace. Broker/admin publishing remains separate.
