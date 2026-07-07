# therealestatelink

WhatsApp-first AI property listing SaaS for Indian real-estate brokers.

The week-one build is **Firebase Emulator-first** and production-shaped: routes use service/provider boundaries, domain models match the intended Firestore structure, and external integrations are mocked locally.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- App: `http://localhost:3000`
- Broker dashboard: `http://localhost:3000/dashboard`
- Mock WhatsApp intake: `http://localhost:3000/dashboard/intake`
- Public listing: `http://localhost:3000/l/rare-corner-ground-floor-flat-parmar-residency`
- Broker website: `http://localhost:3000/b/the-rare-address`
- Super admin: `http://localhost:3000/admin`

## Verify

```bash
npm test
npm run lint
npm run build
```

## Firestore path

Install Firebase CLI, then run:

```bash
firebase emulators:start
```

The app is already configured for:

- Auth emulator on `9099`
- Firestore emulator on `8080`
- Storage emulator on `9199`
- Emulator UI on `4000`

The current UI uses seeded in-memory demo data for fast local exploration. Firestore can be enabled without changing route contracts.

For local Firestore with the emulator:

```bash
cp .env.example .env.local
firebase emulators:start
npm run firestore:seed
```

Then set:

```bash
DATA_SOURCE=firestore
```

Keep `DATA_SOURCE=demo` for quick local UI work without the emulator running.

For hosted Firestore, set `DATA_SOURCE=firestore` plus real service-account values:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

Do not set `FIRESTORE_EMULATOR_HOST` in production.

## Firestore structure

Top-level collections:

- `users`
- `workspaces`
- `platformAdmins`
- `plans`
- `subscriptions`
- `platformSettings`
- `publicListingIndex`

Workspace subcollections:

- `workspaces/{workspaceId}/members`
- `workspaces/{workspaceId}/listings`
- `workspaces/{workspaceId}/media`
- `workspaces/{workspaceId}/leads`
- `workspaces/{workspaceId}/intakeSessions`
- `workspaces/{workspaceId}/whatsappMessages`
- `workspaces/{workspaceId}/analyticsEvents`
- `workspaces/{workspaceId}/auditLogs`
- `workspaces/{workspaceId}/aiGenerations`
- `workspaces/{workspaceId}/settings`

## Provider switching

Mock providers are active by default:

- `AI_DEFAULT_PROVIDER=mock`
- `WHATSAPP_PROVIDER=mock`

Provider interfaces live in:

- `src/lib/ai/ai-provider.ts`
- `src/lib/whatsapp/whatsapp-provider.ts`
- `src/lib/billing/billing-service.ts`

Add live credentials in `.env.local` to implement OpenAI, Gemini, Anthropic, Meta WhatsApp, AiSensy, Interakt, and Razorpay adapters.

## Week-one scope

Built:

- Dashboard shell
- Listing table and seeded listing states
- Public listing page
- Broker mini-site
- Public lead capture route
- Mock WhatsApp intake route
- Mock AI extraction with Indian real-estate shorthand and risk rewriting
- RBAC constants
- Firebase client/admin lazy initialization
- Demo/Firestore repository layer for workspaces, listings, and leads
- Firebase rules and emulator config
- Admin/settings scaffolding

Not yet live-integrated:

- Real Firebase Auth UI
- Real WhatsApp Business webhook verification
- Real OpenAI/Gemini/Anthropic calls
- Razorpay checkout
- Production analytics aggregation
