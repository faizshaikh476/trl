# WhatsApp Opening Message Guard Design

## Goal

Prevent clearly unrelated contacts from consuming listing-intake and outbound-message resources without blocking potential customers who greet differently or describe a property informally.

## Routing

The guard runs locally before an opening text is appended to a listing intake session. It does not call an AI provider.

- Existing commands (`DONE`, `CANCEL`) keep their current behavior.
- A property signal or image starts or advances listing intake normally.
- A greeting-only message, including common variants such as “hello there”, “good morning”, “namaste”, and “salam”, starts an empty introduction session and sends the standard introduction once.
- A clearly unrelated job enquiry containing high-confidence career intent such as “job opportunity”, “vacancy”, “career”, “resume”, or “employment” is retained for admin visibility but receives no automated reply and does not create or advance an intake session.
- Any other ambiguous opening message sends the standard introduction once but is not stored as listing content.
- An introduction-only session remains inactive. Clearly unrelated or ambiguous follow-ups are not appended. A property signal or image activates intake.
- Once a session contains genuine property content or an image, fragmented follow-up details continue to be accepted as they are today.

## Resource Use

- No AI classification is introduced.
- Clearly unrelated contacts cause no outbound WhatsApp message and no intake-session write.
- Ambiguous potential customers cost at most one introduction message and one empty session marker.
- Existing inbound text retention and provider-message deduplication remain unchanged so admins can inspect what happened and duplicate webhooks cannot trigger repeated work.

## Safety and Failure Modes

The unrelated rules are deliberately narrow. Ambiguous messages default to the introduction path rather than being blocked. High-confidence career patterns must match intent phrases, not isolated words that could appear in property content.

The introduction is sent only once. Repeated greetings or ambiguous messages while the empty introduction session exists remain silent.

## Verification

Focused tests will prove:

- “Any job opportunities” receives no reply and creates no intake session.
- A greeting variant receives the introduction once.
- An ambiguous service question receives the introduction once without becoming listing content.
- A job enquiry after the introduction remains silent.
- Property text and photos still start intake.
- Fragmented details remain accepted after genuine intake has started.
