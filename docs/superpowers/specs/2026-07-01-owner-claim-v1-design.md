# Owner Claim V1 Design

## Goal

When a seller sends a property over WhatsApp, therealestatelink should create an owner profile automatically from the sender phone number and generate a private claim link. The seller can open that link, verify basic details, and claim ownership of the listing without creating a broker/admin account.

## Scope

V1 uses possession of the private WhatsApp link as the ownership signal. OTP is intentionally out of scope for this release, but the data model keeps a claim token and verification status so OTP can be added later without moving existing owner profiles.

## Data Model

Add owner profiles under each workspace:

- `workspaces/{workspaceId}/ownerProfiles/{ownerProfileId}`
- `ownerProfileId` is derived from the normalized WhatsApp phone number.
- Fields: phone, display phone, name, occupation, email, status, claimed listing ids, timestamps.

Add global claim tokens:

- `ownerClaimTokens/{token}`
- Fields: workspace id, listing id, owner profile id, phone, status, expires at, claimed at, timestamps.
- Tokens are random, long-lived enough for practical WhatsApp usage, and direct lookup avoids Firestore collection group indexes.

Listings receive optional owner metadata:

- `ownerProfileId`
- `ownerPhone`
- `ownerClaimStatus`
- `ownerClaimedAt`

## Flow

1. Admin WhatsApp intake receives real sender phone, text, and image URLs.
2. AI extracts the listing.
3. Listing is created as a draft or review-ready record.
4. Owner profile is upserted by workspace and phone.
5. Claim token is created and linked to the listing.
6. Intake response includes the private claim link for the seller.
7. Seller opens `/claim/{token}`.
8. Seller submits name, occupation, email, and ownership confirmation.
9. Server validates token, marks profile verified, marks token claimed, and updates listing owner metadata.

## Error Handling

Invalid, expired, or already claimed tokens show a stable public message. Form validation requires name, occupation, valid optional email, and explicit ownership confirmation. Claim mutations run server-side and do not require an authenticated admin session.

## Testing

Add unit tests for phone normalization, owner profile ids, and Firestore path helpers. Run lint, tests, and production build before deployment.
