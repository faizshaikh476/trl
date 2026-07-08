# Listing Plan Limits

## Goal

Add a V1 subscription plan system where the only enforced limit is the number of active published listings per broker workspace.

## Scope

- Plans are managed by Super Admin.
- Workspaces can be assigned to a plan.
- Only `published` listings count toward the plan limit.
- Draft, archived, sold, rented, rejected, expired, unpublished, intake, and review listings do not count.
- Dashboard, Super Admin, and WhatsApp publishing all use the same backend limit check.
- When the limit is reached, the user sees an upgrade prompt instead of creating or publishing another live listing.

## Implementation Steps

1. Add a plan domain model and Firestore-backed billing service with default fallback plans.
2. Add Super Admin server actions for creating, updating, deleting plans, and assigning a workspace plan.
3. Add plan builder UI under Super Admin subscriptions and plan assignment under workspaces.
4. Enforce plan limits before dashboard/admin publish and before WhatsApp creates a published listing.
5. Verify with lint/build and targeted tests where practical.

