# Mobile Side Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible role-specific mobile side menus to the Super Admin and broker shells.

**Architecture:** Keep both async shells as Server Components. Add one small Client Component that controls the existing Sheet primitive and accepts server-rendered brand, navigation, and footer slots.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Base UI Sheet, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Desktop sidebars and route permissions remain unchanged.
- Admin and broker routes remain isolated.
- The drawer closes on link selection, backdrop, close control, and Escape.
- No new dependency is introduced.

---

### Task 1: Shared mobile drawer behavior

**Files:**
- Create: `src/components/navigation/mobile-side-navigation.tsx`
- Test: `src/components/navigation/mobile-side-navigation.test.tsx`

**Interfaces:**
- Consumes: `brand`, `navigation`, and `footer` as `React.ReactNode`; `ariaLabel` and optional `className` values as strings.
- Produces: `MobileSideNavigation(props)` with an accessible `Open navigation` trigger and controlled Sheet state.

- [ ] **Step 1: Write the failing behavior test**

Render the component with a real anchor in its navigation slot. Assert that the navigation is initially absent, appears after pressing `Open navigation`, and disappears after selecting the anchor.

- [ ] **Step 2: Run the test and verify RED**

Run `npm test -- src/components/navigation/mobile-side-navigation.test.tsx` and confirm it fails because the component does not exist.

- [ ] **Step 3: Implement the minimal Client Component**

Use controlled `open` state with the existing `Sheet`, `SheetTrigger`, and `SheetContent`. Attach a click handler to the navigation container that closes only when the click originated inside an anchor.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `npm test -- src/components/navigation/mobile-side-navigation.test.tsx` and confirm all drawer behavior passes.

### Task 2: Integrate both role-specific shells

**Files:**
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/components/dashboard/app-shell.tsx`

**Interfaces:**
- Consumes: `MobileSideNavigation` from Task 1.
- Produces: admin and broker mobile headers with a menu trigger and role-correct drawer content.

- [ ] **Step 1: Add the Super Admin menu**

Render the existing admin navigation list and sign-out form inside `MobileSideNavigation`, retaining cyan active styling and all eleven admin routes.

- [ ] **Step 2: Add the broker menu**

Render the existing broker navigation list and sign-out form inside `MobileSideNavigation`, retaining tone-aware active styling and all six broker routes.

- [ ] **Step 3: Run focused and regression checks**

Run `npm test -- src/components/navigation/mobile-side-navigation.test.tsx`, `npm run lint`, `npm run build`, and `git diff --check`.

### Task 3: Release verification

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: the verified production build.
- Produces: a production release verified at 390 px for both roles.

- [ ] **Step 1: Commit and push the scoped change**

Commit only the navigation component, tests, shell integrations, and these design documents; push `main` without resetting or cleaning unrelated work.

- [ ] **Step 2: Deploy production**

Run `npx vercel@latest deploy . --prod -y` and wait for the production alias.

- [ ] **Step 3: Verify live mobile navigation**

At a 390 px viewport, confirm `/admin/workspaces` exposes only admin routes and `/dashboard` exposes only broker routes; verify the active item and close behavior.

