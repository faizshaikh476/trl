# OTP Audit And Free Plan Design

## Goal

Make broker verification traceable without retaining OTP secrets, and ensure every newly created WhatsApp broker workspace starts on the active Free plan.

## OTP audit

Each owner claim token stores an `otpAudit` object containing the request time, Meta message ID, provider acceptance state, delivery state and timestamps, failed verification attempt count, and successful verification time. The raw OTP is never written to the audit record. The existing OTP hash remains temporary and is deleted after successful verification.

Meta status webhooks update the matching claim token by provider message ID. Supported states are `sent`, `delivered`, `read`, and `failed`. A failed send clears the active OTP challenge so an undelivered code cannot remain valid.

## Default plan

Workspace provisioning resolves the default plan from the live plan catalogue. It selects the active plan with ID `free`; if that plan does not exist, it selects the active plan with the lowest sort order. Existing workspaces and explicit super-admin assignments are unchanged.

## Verification

Unit tests cover Meta status parsing, OTP audit state transitions, default-plan selection, and WhatsApp workspace provisioning. The full lint, test, and production build suites must pass before deployment.
