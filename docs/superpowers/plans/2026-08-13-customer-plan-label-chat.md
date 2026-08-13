# Customer Plan Label and Direct Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct customer-facing plan labels and add one-click access to the retained WhatsApp conversation.

**Architecture:** Keep `planId` as the stable stored identifier. Resolve names at the server-rendered directory boundary from `billingService.listPlans()`, and use a URL parameter to choose the existing drawer's initial tab.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firestore, Vitest.

## Global Constraints

- Do not mutate purchases, workspaces, wallets, or customer activity records.
- Do not create a second chat implementation or bypass WhatsApp reply-window rules.
- Preserve directory search, filtering, sorting, pagination, and close URLs.

---

### Task 1: Catalogue-backed plan labels

**Files:**
- Modify: `src/lib/customer-operations/customer-directory-model.ts`
- Test: `src/lib/customer-operations/customer-directory-model.test.ts`
- Modify: `src/components/admin/customer-directory.tsx`
- Modify: `src/app/admin/workspaces/page.tsx`

**Interfaces:**
- `toDirectoryRow(activity, planNamesById)` receives `Readonly<Record<string, string>>` and returns the catalogue-backed `planLabel`.
- `CustomerDirectory` receives `planNamesById` from the server page.

- [ ] Add a failing test where `planId: "hyper"` and `{ hyper: "Starter" }` must return `planLabel: "Starter"`.
- [ ] Run the focused model test and confirm the old title-cased result fails.
- [ ] Add the lookup parameter and pass the plan catalogue from `AdminWorkspacesPage`.
- [ ] Run the focused model test and confirm it passes.

### Task 2: One-click Conversation entry

**Files:**
- Modify: `src/components/admin/customer-directory.tsx`
- Modify: `src/components/admin/customer-detail-drawer.tsx`
- Modify: `src/app/admin/workspaces/page.tsx`
- Test: `src/lib/customer-operations/customer-directory-model.test.ts`

**Interfaces:**
- `customerDirectoryHref(query, overrides)` preserves directory state and supports `contact` plus `view: "conversation"`.
- `CustomerDetailDrawer` receives `initialTab: "overview" | "conversation"`.

- [ ] Add a failing URL-model test proving Chat preserves the active tab/filter and adds `contact` plus `view=conversation`.
- [ ] Export the directory URL builder from the model and use it for existing links and the new Chat action.
- [ ] Parse `view` on the server page and pass the drawer's initial tab.
- [ ] Run focused tests and confirm Chat opens the existing Conversation tab.

### Task 3: Verify and release

**Files:**
- No additional source files expected.

**Interfaces:**
- Consumes the corrected directory and drawer behavior.
- Produces a production release on the existing Vercel project.

- [ ] Run focused tests, the full test suite, lint, build, and `git diff --check`.
- [ ] Commit only scoped files, push `main`, and deploy production.
- [ ] Verify Monesh displays Starter and the Chat action opens Conversation on the live site.

