# Listing Work Queue Design

## Problem

The broker dashboard currently sorts listings by `updatedAt`. Routine actions on an older listing—such as publishing, editing, or archiving it—can therefore move it above a newly created listing. Archived listings also appear in the default mixed-status view, which makes the list look out of chronological order and obscures items that still need work.

Published and ready-to-publish listings use nearly identical neutral cards. Their badges differ, but the workflow distinction is easy to miss while scanning a long list.

## Goals

- Make the default listing view operate as a current work queue.
- Keep newly created listings predictably above older listings.
- Remove archived listings from the default view without deleting or making them inaccessible.
- Clearly distinguish live listings from listings waiting to be published.
- Preserve the existing search and status-filter workflow.

## Listing Visibility and Ordering

The empty status filter, displayed as “All status,” will exclude listings whose status is `archived`.

Selecting the explicit `Archived` status option will show archived listings. Every other explicit status filter will continue to show only that selected status.

After search and filters are applied, matching listings will be sorted by `createdAt` descending. `updatedAt` will not determine display order. This ensures edits and status changes do not cause old listings to jump above new ones.

If a listing has an invalid or missing `createdAt`, it will sort after listings with a valid creation timestamp. Its relative position will use the existing input order to keep the result deterministic.

## Visual Status Hierarchy

The selected visual direction is a restrained workflow accent:

- `published`: white card, slim emerald left accent, and the existing high-contrast Published badge. This communicates that the listing is live without tinting the full surface.
- `ready_to_publish`: slim amber left accent, very light amber surface, and an amber status badge. This communicates that broker action is required.
- all other statuses: existing neutral card treatment, preventing excessive status colors.

The status badge remains textual so color is not the only signal. Existing listing actions and card content remain unchanged.

## Scope

The behavior belongs in the shared listing-table preparation layer so the dashboard overview and dedicated listings page remain consistent.

No database schema, repository query, billing behavior, public listing behavior, or listing status transition will change. This is a presentation and ordering change only.

## Testing

Focused tests will verify that:

- the default view excludes archived listings;
- the explicit Archived filter returns archived listings;
- matching listings are ordered newest-created first;
- updating an older listing does not move it above a newer listing;
- invalid creation timestamps sort after valid timestamps.

Relevant component tests, linting for touched files, and `git diff --check` will be run before completion.
