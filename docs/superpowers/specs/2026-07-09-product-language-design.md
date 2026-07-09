# Product Language Design

## Voice

TRL speaks clearly, directly, and confidently. Product surfaces describe what the user can do, what is happening now, and what needs attention. They do not explain implementation, architecture, database choices, or future development plans.

## Rules

- Use short headings and one-sentence supporting copy.
- Prefer actions and outcomes: “Manage plans”, “Share your catalogue”, “Try again”.
- Remove prototype language including “ready”, “next”, “mocked”, and “production-ready” when used as development commentary.
- Remove Firebase, Firestore, RBAC, provider abstractions, document storage, deployment logs, and route paths from ordinary user-facing copy.
- Keep necessary Meta, webhook, API, and credential terms only inside super-admin diagnostics.
- Keep legal and compliance pages technically precise.

## Surfaces

The pass covers login, errors, broker settings, listing creation and verification, super-admin overview, users, workspaces, plans, AI, usage, audit, and WhatsApp administration.

## Verification

A copy regression test scans key customer-facing files for banned implementation phrases. Lint, all tests, and the production build must pass before deployment.
