# Claim Role Selector

## Goal

Replace the free-text occupation field in property verification with a compact, mobile-friendly role selector.

## Experience

- Label the field `You are a`.
- Offer `Broker`, `Owner`, `Builder`, and `Other`.
- Use a native select control for reliable behavior on older and smaller phones.
- When `Other` is selected, reveal a required text field labelled `Your role`.
- Preserve a previously saved standard role when the form reopens.
- Treat a previously saved custom occupation as `Other` and prefill `Your role`.

## Scope

Apply the same behavior to:

- The verification modal opened from a property page.
- The standalone claim route retained for existing links.

Profile settings remain editable as they are today.

## Data And Validation

- Continue storing the final human-readable value in the existing `occupation` field.
- Standard selections store `Broker`, `Owner`, or `Builder`.
- `Other` stores the trimmed custom role.
- Reject missing, unsupported, or empty custom roles on the server.
- Existing occupation values remain compatible without a data migration.

## Verification

- Unit-test role normalization and validation.
- Confirm the conditional field works in the browser.
- Run lint and the production build.
- Check the form at a narrow mobile viewport.
