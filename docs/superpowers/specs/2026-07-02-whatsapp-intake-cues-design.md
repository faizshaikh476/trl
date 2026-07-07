# WhatsApp Intake Cues Design

## Goal

Make WhatsApp intake feel guided and real: sellers are prompted to send property details and media, told to type `DONE` when finished, shown an immediate wait message, and then receive the claim link after the listing draft is created.

## Recommended Approach

Use a lightweight Firestore-backed intake session per workspace and sender phone number. Incoming text and media are accumulated until the seller sends `DONE`. Extraction runs only from the collected session content, not from every long message.

This avoids premature draft creation, supports normal WhatsApp behavior where sellers send details across multiple messages, and keeps the first version small enough to ship quickly.

## Conversation Flow

1. Greeting or first short message:
   - Reply: ask for property details, location, price, and photos/videos.
   - Tell the seller to type `DONE` when finished.
2. Property text/media messages:
   - Append to the active intake session.
   - Reply: acknowledge receipt and tell the seller to keep sending details or type `DONE`.
3. `DONE` with collected content:
   - Reply immediately: ask the seller to wait 30-45 seconds.
   - Run AI extraction against all collected text and media.
   - Create the listing draft, owner profile, media records, and claim token.
   - Send the final claim link.
4. `DONE` without collected content:
   - Reply asking the seller to share property details or images first.
5. `CANCEL`:
   - Cancel the active intake session and tell the seller they can send `Hi` to start again.

## Data Model

Use `workspaces/{workspaceId}/intakeSessions/{phone}` with:

- `workspaceId`
- `phone`
- `status`: `collecting`, `processing`, `completed`, or `cancelled`
- `messages`: ordered text snippets
- `media`: ordered image/video/document references
- `listingId`
- `createdAt`, `updatedAt`, `completedAt`

## Error Handling

If AI extraction or listing creation fails after the wait cue, the bot replies with a stable apology and asks the seller to try again or contact the broker. The session remains available for debugging instead of silently disappearing.

## Testing

Add unit coverage for the WhatsApp service:

- Greeting starts a collecting session and returns the guided prompt.
- Property messages append to the session and do not create a listing.
- `DONE` returns the 30-45 second wait cue first, then the follow-up creates a listing and claim link from accumulated content.
- `DONE` without content asks for details first.
