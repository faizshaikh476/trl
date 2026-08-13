# Listing Work Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the broker listing feed a predictable newest-first work queue that hides archived listings by default and clearly distinguishes published listings from ready-to-publish listings.

**Architecture:** Extract filtering, ordering, and semantic status presentation into a small pure model next to the shared listing table. Both dashboard routes will continue to use `ListingTable`, which will consume the model and apply restrained emerald or amber card styling without adding client-side state.

**Tech Stack:** Next.js 16 App Router Server Components, React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- The empty “All status” filter excludes `archived` listings.
- The explicit `Archived` filter remains available and returns archived listings.
- Display order uses valid `createdAt` timestamps descending; `updatedAt` never changes display order.
- Invalid creation timestamps sort after valid timestamps while preserving their input order.
- Published uses a white card with a slim emerald accent and a textual Published badge.
- Ready to publish uses a pale amber card with a slim amber accent and a textual Ready to publish badge.
- Other statuses keep the neutral treatment.
- Do not change persistence, billing, public listing behavior, or status transitions.
- Do not add client-side state or new dependencies.

---

### Task 1: Pure listing work-queue model

**Files:**
- Create: `src/components/listings/listing-table-model.ts`
- Create: `src/components/listings/listing-table-model.test.ts`

**Interfaces:**
- Consumes: `Listing` and `ListingStatus` from `src/types/domain.ts`.
- Produces: `ListingFilters`, `prepareListingsForTable(listings: Listing[], filters: ListingFilters): Listing[]`, and `listingStatusPresentation(status: ListingStatus): { tone: "published" | "ready" | "neutral"; hint: string | null }`.

- [x] **Step 1: Write failing work-queue tests**

Create fixtures with distinct `createdAt` and `updatedAt` values, then assert these behaviors:

```ts
it("hides archived listings by default and sorts by creation time", () => {
  const result = prepareListingsForTable([
    listing({ id: "old-edited", createdAt: "2026-08-10T10:00:00.000Z", updatedAt: "2026-08-13T10:00:00.000Z" }),
    listing({ id: "new-ready", status: "ready_to_publish", createdAt: "2026-08-13T09:00:00.000Z", updatedAt: "2026-08-13T09:00:00.000Z" }),
    listing({ id: "archived", status: "archived", createdAt: "2026-08-13T11:00:00.000Z", updatedAt: "2026-08-13T11:00:00.000Z" }),
  ], {});

  expect(result.map((item) => item.id)).toEqual(["new-ready", "old-edited"]);
});

it("shows archived listings when explicitly filtered", () => {
  const result = prepareListingsForTable([
    listing({ id: "published" }),
    listing({ id: "archived", status: "archived" }),
  ], { status: "archived" });

  expect(result.map((item) => item.id)).toEqual(["archived"]);
});

it("places invalid creation timestamps last without reordering them", () => {
  const result = prepareListingsForTable([
    listing({ id: "invalid-one", createdAt: "invalid" }),
    listing({ id: "valid", createdAt: "2026-08-13T09:00:00.000Z" }),
    listing({ id: "invalid-two", createdAt: "" }),
  ], {});

  expect(result.map((item) => item.id)).toEqual(["valid", "invalid-one", "invalid-two"]);
});
```

- [x] **Step 2: Run the model tests and verify RED**

Run: `npm test -- --run src/components/listings/listing-table-model.test.ts`

Expected: FAIL because `listing-table-model.ts` and its exports do not exist.

- [x] **Step 3: Implement filtering and stable creation-time ordering**

Move the existing title/location, status, transaction, and quality filtering into `prepareListingsForTable`. Add the default archived exclusion only when `filters.status` is empty. Sort a copied, indexed result so valid timestamps are descending and invalid timestamps retain input order:

```ts
return listings
  .map((listing, inputIndex) => ({ listing, inputIndex }))
  .filter(({ listing }) => matchesFilters(listing, filters))
  .sort((left, right) => compareCreatedAt(left, right))
  .map(({ listing }) => listing);
```

- [x] **Step 4: Add semantic presentation tests and implementation**

Assert and implement:

```ts
expect(listingStatusPresentation("published")).toEqual({
  tone: "published",
  hint: "Live and visible to buyers",
});
expect(listingStatusPresentation("ready_to_publish")).toEqual({
  tone: "ready",
  hint: "Ready for review and publishing",
});
expect(listingStatusPresentation("draft")).toEqual({ tone: "neutral", hint: null });
```

- [x] **Step 5: Run the model tests and verify GREEN**

Run: `npm test -- --run src/components/listings/listing-table-model.test.ts`

Expected: PASS for default visibility, explicit Archived filtering, stable creation-time ordering, existing filters, and semantic status presentation.

### Task 2: Apply the work queue and approved visual hierarchy

**Files:**
- Modify: `src/components/listings/listing-table.tsx`
- Test: `src/components/listings/listing-table-model.test.ts`

**Interfaces:**
- Consumes: `prepareListingsForTable` and `listingStatusPresentation` from Task 1.
- Produces: consistent work-queue behavior for both `/dashboard` and `/dashboard/listings` through the existing `ListingTable` component.

- [x] **Step 1: Replace local filtering with the model**

Import the model helpers and `ListingFilters`, remove the private `filterListings` implementation, and compute:

```ts
const filteredListings = prepareListingsForTable(listings, filters);
```

Fetch hero media only for `filteredListings` so hidden archived listings do not trigger unnecessary media reads.

- [x] **Step 2: Apply restrained status styling**

For each row, obtain `const presentation = listingStatusPresentation(listing.status)` and apply:

```ts
const articleTone =
  presentation.tone === "published"
    ? "border-l-4 border-l-emerald-500 bg-white"
    : presentation.tone === "ready"
      ? "border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/40"
      : "bg-white";

const badgeTone =
  presentation.tone === "ready"
    ? "border border-amber-200 bg-amber-100 text-amber-900"
    : undefined;
```

Keep the existing textual status badge and render `presentation.hint` below the location using emerald text for published and amber text for ready-to-publish. Do not alter actions or other status treatments.

- [x] **Step 3: Run focused tests**

Run: `npm test -- --run src/components/listings/listing-table-model.test.ts src/lib/listings/listing-service.test.ts`

Expected: PASS.

- [x] **Step 4: Run touched-file lint and whitespace validation**

Run: `npx eslint src/components/listings/listing-table.tsx src/components/listings/listing-table-model.ts src/components/listings/listing-table-model.test.ts`

Run: `git diff --check`

Expected: both exit successfully with no output indicating errors.

- [x] **Step 5: Review the final diff and commit**

Run: `git diff -- src/components/listings/listing-table.tsx src/components/listings/listing-table-model.ts src/components/listings/listing-table-model.test.ts`

Confirm the diff changes only listing-table preparation and presentation. Then commit:

```bash
git add docs/superpowers/plans/2026-08-13-listing-work-queue.md \
  src/components/listings/listing-table.tsx \
  src/components/listings/listing-table-model.ts \
  src/components/listings/listing-table-model.test.ts
git commit -m "Improve broker listing work queue"
```
