# therealestatelink Week One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Firebase Emulator-first local SaaS demo that preserves production data boundaries for real deployment.

**Architecture:** Next.js App Router renders dashboard, admin, public listing, and broker website routes. Domain behavior sits behind service/provider interfaces so mock AI, mock WhatsApp, and Razorpay placeholders can be replaced without changing routes or UI. Firestore collection names, RBAC roles, Zod validation, Firebase Admin/client lazy initialization, and rules are production-shaped from the first version.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Firebase Auth/Firestore/Storage/Admin SDK, Zod, Vitest.

---

### Task 1: Scaffold and Verify Baseline

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `components.json`

- [x] Create a Next.js App Router project named `therealestatelink`.
- [x] Initialize shadcn/ui with non-interactive defaults.
- [x] Fix Tailwind v4 font tokens to use literal Geist names.
- [x] Add Vitest and run red tests for RBAC, AI extraction, and lead validation.

### Task 2: Production-Shaped Core

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/lib/rbac/permissions.ts`
- Create: `src/lib/firebase/client.ts`
- Create: `src/lib/firebase/admin.ts`
- Create: `src/lib/ai/**`
- Create: `src/lib/whatsapp/**`

- [x] Add workspace/listing/lead/intake/media/audit/analytics domain types.
- [x] Add permission constants and role permission mapping.
- [x] Add lazy Firebase client/admin initializers.
- [x] Add Firestore path contracts and demo/Firestore repository switching for listings and leads.
- [x] Add AI provider interface and mock/OpenAI/Gemini/Anthropic provider slots.
- [x] Add WhatsApp provider interface and mock/Meta/AiSensy/Interakt provider slots.

### Task 3: Product Loop

**Files:**
- Create: `src/app/dashboard/**`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/l/[slug]/page.tsx`
- Create: `src/app/b/[brokerSlug]/page.tsx`
- Create: `src/app/api/leads/route.ts`
- Create: `src/app/api/mock-whatsapp/route.ts`

- [x] Build dashboard overview, listings, leads, intake, settings, and admin pages.
- [x] Build public listing page with gallery, facts, broker card, enquiry form, and risk disclaimer.
- [x] Build broker mini-site with active listings.
- [x] Add mock WhatsApp intake route that creates listing drafts through the AI service.
- [x] Add public lead route with Zod validation.

### Task 4: Deployment Scaffolding

**Files:**
- Create: `.env.example`
- Create: `firebase.json`
- Create: `firebase/security-rules/firestore.rules`
- Create: `firebase/security-rules/storage.rules`
- Create: `firebase/seed/demo-seed.json`
- Create: `README.md`

- [x] Document Firebase emulator and Vercel deployment path.
- [x] Add security rules that isolate workspace data.
- [x] Add environment variable placeholders for real AI, WhatsApp, and Razorpay providers.

### Self Review

- Scope is intentionally week-one: real Firebase-shaped boundaries and local demo loop are built; real external AI/WhatsApp/Razorpay calls remain provider placeholders.
- No route calls provider SDKs directly.
- Public users submit leads through a route, not direct Firestore writes.
- The demo repository is in-memory for instant local use, while docs and rules define the Firestore deployment path.
