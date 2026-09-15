# BravoPilot.ai — Technical Design Document (TDD)

**Status:** Draft v1
**Scope:** MVP architecture (lean stack) + target enterprise architecture
**Last updated:** 2026-09-15

## 1. Design Approach

The vision doc's long-term stack (Next.js frontend, .NET API, Azure SQL, Azure Blob Storage, Azure OpenAI, Entra ID, Redis, Application Insights) is the right target for an enterprise-grade, security-vendor-neutral product. But building all of it before validating that consultants will pay is the wrong sequencing risk for an MVP.

This TDD defines:
- **MVP architecture** — ships fast, proves the core loop (intake → AI generation → exportable deliverable), minimizes infra surface area.
- **Target architecture** — where we grow to once the product/market fit is validated and enterprise/federal customers need Azure-native compliance posture, SSO via Entra ID, and dedicated backend scaling.

Module boundaries (below) are designed so the MVP backend logic can be lifted into a dedicated API service later without a rewrite of business logic — only the transport/hosting layer changes.

## 2. MVP Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App (Vercel)                   │
│  ┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  App Router    │  │  Route Handlers  │  │  Server Actions │ │
│  │  (UI, forms)   │  │  (/api/*)        │  │  (mutations)    │ │
│  └───────────────┘  └─────────────────┘  └─────────────────┘ │
└──────────────┬───────────────────┬────────────────┬───────────┘
               │                   │                │
        ┌──────▼──────┐    ┌───────▼───────┐  ┌─────▼──────┐
        │  Supabase    │    │  Azure OpenAI  │  │   Stripe   │
        │  Postgres    │    │  (GPT-4o)      │  │  Billing   │
        │  Auth        │    └────────────────┘  └────────────┘
        │  Storage     │
        └──────────────┘
```

### 2.1 Frontend
- **Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.**
- Server Components for data-heavy views (project list, deliverable viewer); Client Components for the intake wizard and rich-text editor.
- Rich text editing for deliverable review: **implemented as plain heading/paragraph fields (Epic E)** rather than TipTap — our content model is already structured (`{ heading, paragraphs: string[] }[]`, §2.6), and the deliverables generated so far are plain prose with no inline formatting need, so a full ProseMirror-based editor would have added real complexity (HTML↔JSON↔section-schema conversion) for a requirement that doesn't exist yet. Revisit TipTap if/when a deliverable type needs inline formatting (bold, links, tables) that plain fields can't express — the storage shape doesn't need to change either way.
- **UI theme (Sprint 2):** a Fluent 2-inspired look — blue `--brand` (`#0f6cbd`, Fluent's brand blue) plus a blue→purple `--gradient-brand` for hero/personality moments, since this product drafts Microsoft Purview deliverables and should feel like it belongs next to Purview/Learn/the M365 admin centers rather than a generic navy B2B SaaS. Iconography is `@fluentui/react-icons` (Microsoft's own Fluent icon set) rather than a generic icon library — one real icon per service type and deliverable category, used on the dashboard, intake form, services checklist, generate form, and deliverable view.
  - **Real bug found while building this**: `@fluentui/react-icons` components use Griffel (CSS-in-JS) internally and cannot be rendered directly in a Server Component (`Attempted to call __styles() from the server`). Fixed by re-exporting the icon set through a `"use client"` barrel file (`src/components/icons.tsx`).
  - **Second, subtler bug found the same way**: a Server Component that destructures an icon out of an object exported from that `"use client"` barrel (e.g. `const Icon = SERVICE_ICONS[service]`) and renders it itself gets `undefined` at render time — a Turbopack/RSC client-boundary quirk with object-valued exports, confirmed by bisecting a throwaway preview route rather than guessing. The fix is architectural, not a workaround: a Server Component must render `<ServiceIcon service={x} />` (a small "use client" component that does the lookup itself, taking only a plain string prop across the boundary) rather than doing the lookup itself and handing the resolved component reference to JSX. Every Client Component (`GenerateForm`, `ServicesForm`, `DeliverableView`) that does the identical-looking lookup *inside its own client code* is unaffected — the failure mode is specific to a Server Component reaching into a client module's object export.

### 2.2 Backend
- MVP backend logic lives in **Next.js Route Handlers and Server Actions** — no separate service to deploy/operate at MVP scale. All business logic (generation orchestration, template rendering, export) is organized into a `lib/` module layer with no framework dependencies, so it can be extracted into a standalone API service later with minimal churn.
- Background jobs (document generation, export rendering) run via a queue-backed worker (see §2.5) rather than inline in the request, since generation can take up to ~60s.

### 2.3 Database — Supabase Postgres
- Chosen over Azure SQL for MVP because it bundles Postgres + Auth + Storage + row-level security in one managed service, cutting setup time significantly. Schema is standard relational SQL; migrating to Azure SQL later is a schema-compatible port, not a redesign (see ERD.md — no Postgres-only features are used in core tables besides `jsonb`, which maps to `nvarchar(max)` + JSON functions in SQL Server if needed).
- Row-Level Security (RLS) policies scope every table to the owning consultant/account from day one — this is also what makes the eventual multi-tenant Partner/Enterprise tier straightforward.

### 2.4 Auth
- **Supabase Auth** (email/password + Google + Microsoft OAuth) for MVP.
- Target architecture swaps/extends this to **Microsoft Entra ID** (including Entra ID B2C or workforce tenant SSO) once Partner/Enterprise customers need enterprise SSO and conditional access — the auth provider is isolated behind a thin adapter in `lib/auth/` for exactly this reason.
- **Multi-seat teams:** an account can now have more than one `users` row (`role`: `'owner' | 'member'`, `supabase/migrations/0017_multi_seat_teams.sql`). Every account-scoped RLS policy already keyed off `auth_account_id()` (a lookup by `auth.uid()`, not a hardcoded single user), so a second user under the same `account_id` gets full project/deliverable/branding access with no policy changes — the only new RLS is `users_owner_manage_role`, letting an owner update a teammate's role (`auth_is_owner()`, a `SECURITY DEFINER` helper following the same pattern as `auth_account_id()`/`is_platform_admin()`, needed because a policy on `users` can't safely re-query `users` under its own RLS without it). Owner-gated at the application layer via a new `requireAccountOwner()` (`src/lib/auth/session.ts`): team management, billing (Stripe checkout/portal), and account deletion. Everything else — projects, deliverables, generation, export, FileVault, branding, changing your own password — stays available to any user on the account, matching a typical shared-workspace model rather than per-seat permissions.
- **Invite flow:** `handle_new_auth_user()` (the trigger that provisions a row in `public.users`/`public.accounts` for every new `auth.users` row) now branches on `raw_user_meta_data->>'invited_account_id'` — present and valid → join that account as `'member'`; otherwise → the original behavior, a brand-new account as `'owner'`. The invite itself uses Supabase's own `admin.auth.admin.inviteUserByEmail()` (no separate email-sending provider needed — same transactional-email path signup/OAuth already uses), with `invited_account_id` passed as user metadata and `redirectTo` pointing at the existing `/auth/callback?next=/set-password` — no changes needed to `/auth/callback` itself, since it already redirects to whatever `next` says once it exchanges the invite code for a session. `/set-password` reuses `changePasswordAction` rather than a separate code path.

### 2.5 AI Generation Engine
- **Azure OpenAI (GPT-4o or later)** is the target provider, not a generic OpenAI API key — customers in healthcare/gov/defense care about data residency and Microsoft's enterprise data handling terms, and this is a differentiator worth having.
  - **Implemented (Epic D):** provider is isolated behind one function, `src/lib/ai/provider.ts`. It currently defaults to a standard OpenAI API key (`OPENAI_API_KEY`) as a temporary substitute to unblock testing without an Azure subscription, falling back to Azure OpenAI if that key isn't set. **Revert to Azure OpenAI before any real federal customer** (Bravo Consulting Group, PRD §11) — data residency and Microsoft enterprise terms don't apply to a standard OpenAI key. Switching is an env var change, not a code change.
- Generation flow (as implemented):
  1. Route Handler / Server Action receives a "generate deliverable" request.
  2. Assembles a prompt from: intake data (structured) + selected services + deliverable-specific prompt template (versioned, stored in `prompt_templates`) + relevant Knowledge Base snippets. Retrieval is real semantic (pgvector) search layered on the original service/industry tag filter (`src/lib/generation/knowledge-base.ts`, `supabase/migrations/0022_kb_semantic_search.sql`) — the tag filter still gates candidates, embedding similarity ranks within that set, and retrieval falls back to tag-filter-only whenever a real semantic result isn't available (no AI provider configured, or an entry hasn't been embedded yet).
  3. Calls the AI provider, parses the structured response (JSON matching the deliverable's section schema — see §2.6), stores it as a new deliverable version.
  4. Runs through a real queue (below), not synchronously within the request — `runGeneration` itself (`src/lib/generation/run.ts`) never changed shape to get there, exactly as this section originally anticipated.
- **Queue: built** (`src/lib/generation/jobs.ts`, `src/app/api/cron/process-generation-jobs/route.ts`, `vercel.json`). `generation_jobs` rows are enqueued (`status: 'queued'`) and returned immediately; a Vercel Cron tick (once a minute — its finest granularity) claims up to 5 queued jobs atomically via a `claim_generation_jobs` Postgres function (`for update skip locked`, so two overlapping ticks can't double-process the same job — `supabase/migrations/0021_generation_job_queue.sql`) and runs them one at a time. No new vendor (no Redis, no Azure Service Bus, no Inngest/Trigger.dev) — built entirely on infrastructure this project already has. The client (`generate-form.tsx`) polls `GET /api/generation-jobs/[id]` every 2.5s per job until all are terminal, then refreshes. Trade-off accepted deliberately: up to ~60s queue latency before a job even starts, and a 10-deliverable batch can take several minutes end to end since only 5 process per tick — a real message queue's sub-second dispatch this is not, but it does solve the actual problem (a large batch no longer risks a platform function timeout, and generation no longer blocks the request that triggered it).

### 2.6 Deliverable / Document Templates
- **Full Phase 2 deliverable catalog complete (Sprint 2, PRD §9):** Executive Summary, SOW, HLD (MVP), plus DLP Design, Retention Strategy, Sensitivity Labeling Plan, Low-Level Design, Testing Guide, UAT Plan, Rollback Procedures, Operational Runbooks, CAB Request, Change Management Plan, Compliance Report — 14 types total. Each has a **structured template**: a fixed set of sections, each with its own prompt fragment and expected output schema (e.g., `{ heading: string, paragraphs: string[] }[]`). LLD reuses HLD's per-service conditional-section pattern (`requires_service` in `section_schema`, PR/migration 0005); the process-oriented docs (Testing Guide, UAT Plan, Rollback Procedures, Runbooks, CAB Request, Change Management) use fixed sections but instruct the model to itemize content per service in scope within each section, the same pattern SOW uses. Compliance Report carries the strongest disclaimer language in the catalog (explicit "not a certified assessment" language as its own section content, not just a closing caveat) since it's the type most likely to be misread as an actual audit artifact if handled carelessly.
- **Bravo practice-area expansion (PRD §12) — catalog complete:** the platform covered only Bravo's Purview-based Data Security & Compliance practice until now. Adds `cloud_migration`/`app_modernization`/`sharepoint`/`analytics_ai` services and one flagship deliverable per new practice area (Cloud Migration Plan, App Modernization Plan, SharePoint Governance Plan, Data & Analytics Strategy — same 8-section depth as the original Purview design docs). Critically, the 10 templates above that were worded as if every project only ever has Purview services in scope (persona lines like "senior Microsoft 365 security and compliance consultant," HLD's "reference actual Purview capabilities by name") needed generalizing first — otherwise a Cloud-Migration-only project would still get Purview-flavored Core docs. Shipped as version-2 rows (`supabase/migrations/0014_generalize_core_prompts.sql`), following the `prompt_templates` versioning design in `docs/ERD.md` (history kept for the `deliverable_versions` audit trail) rather than an in-place edit. HLD's `section_schema` gained 4 new `requires_service` design sections alongside the original 8, same pattern. `supabase/migrations/0015_practice_area_kb_and_deliverables.sql` then added 12 Knowledge Base entries (3 per new service) and the 4 flagship prompt templates themselves — the catalog is now 18 deliverable types across 12 services / 5 practice areas. Same first-draft-content caveat as the rest of the catalog (PRD §10, not SME-reviewed); not yet exercised through live AI generation.
- AI output is validated against this schema (Zod) before being accepted — this is what keeps generated docs formatted consistently rather than free-form prose, per PRD FR-11.
- **DOCX export:** `docx` npm package (`src/lib/export/docx.ts`), populating a firm-branded template (logo/colors read from `branding`, editable at `/dashboard/settings` — Server Action in `src/app/dashboard/branding/actions.ts`, not a literal `PUT /accounts/me/branding` route). The logo is fetched server-side once (`src/lib/export/logo.ts`) and reused as raw bytes across all three export formats rather than each builder re-fetching the URL; https-only, PNG/JPEG-only, 5MB cap, 5s timeout, and any fetch failure silently omits the logo rather than failing the export.
- **PDF export:** `@react-pdf/renderer` (`src/lib/export/pdf.tsx`) rather than the Puppeteer approach originally planned here — a pure-JS renderer avoids bundling headless Chromium into a Vercel serverless function, a real deployment-size/cold-start risk. Revisit if a future deliverable type needs HTML/CSS fidelity this can't express.
- **Download flow (implemented, Epic E):** `GET /api/projects/{id}/deliverables/{deliverableId}/export?format=docx|pdf|pptx` streams the file directly rather than uploading to Storage first — exports are cheap to regenerate from `deliverable_versions.content` on every request, so the Storage/signed-URL round trip in §2.7 below isn't needed for this. `docs/openapi.yaml` updated to match. Also accepts `&disposition=inline` (PDF only meaningfully) so the FileVault's built-in viewer can embed the file in an `<iframe>` instead of triggering a download.
- **FileVault (`/dashboard/vault`):** a cross-project gallery over every `ready` deliverable (`src/lib/vault/service.ts`), grouped by project, so a consultant doesn't need to open each project individually to find something already generated. Deliberately doesn't introduce its own file storage — it's a browsing UI over the same on-demand export pipeline above, not a second copy of the data. Per deliverable: **View** opens a modal with the PDF in an `<iframe>` (the browser's native PDF viewer supplies print/zoom/download controls — no PDF.js or similar library needed), **DOCX/PDF/PPTX** are direct download links (same export route), and **Email** builds a `mailto:` link containing a direct link to the file rather than actually attaching it — there's no email-sending provider configured in this project (see `.env.example`), and `mailto:` can't attach a generated-on-demand file anyway; the recipient still needs their own BravoPilot session to open the link, which the UI states explicitly.
- **PPTX export (Sprint 2):** `pptxgenjs` (`src/lib/export/pptx.ts`) — a title slide, then one or more content slides per section (paragraphs become bullets, split across slides once a section overflows a character budget). This is a slide deck, not a page-for-page reflow of the DOCX/PDF — same content, presentation-appropriate layout. Logo embedding shipped alongside the branding settings UI; `pptxgenjs`'s declared (but, per its shipped bundle, dead-code) `image-size` dependency is pinned to a patched 2.x via `package.json` `overrides` regardless, so the earlier DoS advisory (icon/JXL/HEIF parsers) no longer shows up in `npm audit`.

### 2.7 Storage
- **Supabase Storage** for uploaded assets (firm logos) and any future case where a file needs to persist rather than be regenerated on demand, with per-account access policies. Swappable for Azure Blob Storage later behind a thin storage adapter (`lib/storage/`). Not used for DOCX/PDF exports — see §2.6.

### 2.8 Billing
- **Stripe** subscriptions (Checkout + Customer Portal + webhooks) for Consultant/Professional tiers. **Implemented (Sprint 2).**
- `subscriptions` is read-only for the account under RLS (docs/ERD.md) — writes happen server-side via `src/lib/supabase/admin.ts`, a service-role client that bypasses RLS entirely. This is the app's first use of the service role; used only in the checkout/portal Route Handlers and the Stripe webhook handler (which has no user session to write under at all). Never import this client into a Client Component or otherwise expose the key to the browser.
- Price IDs (`STRIPE_PRICE_ID_CONSULTANT`/`STRIPE_PRICE_ID_PROFESSIONAL`) come from Products/Prices created in the Stripe Dashboard — this app can't provision those itself, same class of external-account dependency as the Azure OpenAI deployment (docs/PRD.md §11).
- Usage limits per tier (PRD FR-16) are **not implemented** — no numeric limits have been decided yet (how many projects/generations per plan). Everything up through Stripe subscription tracking is built; enforcing limits is a separate follow-up once those numbers are chosen. Not to be confused with the flat, plan-independent generation rate cap described below — that's an abuse/cost-runaway guardrail, not a pricing decision.
- **Generation rate limiting:** a flat 50-generations-per-24h ceiling per account (`src/lib/generation/rate-limit.ts`), enforced identically in both entry points into the generation pipeline (the Server Action and the `POST /api/projects/{id}/generate` route). Exists purely so a compromised account or a scripting error can't turn into unbounded AI-provider spend — same ceiling regardless of plan, deliberately not a substitute for FR-16 above.
- **Auth rate limiting:** a basic in-memory sliding-window limiter (`src/lib/rate-limit/edge.ts`) on POST requests to `/login` and `/signup`, applied in `src/proxy.ts`. Known, accepted limitation: state is per edge instance and resets on cold start, so it's a deterrent against a single scripted client, not a hard ceiling under real distributed adversarial load — swap in a shared store (Upstash Redis or similar) before relying on this alone.

### 2.9 Hosting & Ops
- **Vercel** for the Next.js app (frontend + Route Handlers).
- **Sentry** for error tracking (`@sentry/nextjs`, wired via `src/instrumentation.ts`/`src/instrumentation-client.ts`/`src/sentry.*.config.ts`, `next.config.ts` wrapped with `withSentryConfig`), **Vercel Analytics** for basic usage — a lightweight substitute for Application Insights at MVP scale; swap-in candidate for Phase 2 if the product needs Azure-native monitoring for enterprise sales conversations. Sentry no-ops safely until a real `NEXT_PUBLIC_SENTRY_DSN` is set (same "configure when you have the real credentials" pattern as Stripe/OpenAI) — before this, the wiring existed only as an unused env var placeholder with no actual initialization code anywhere.

## 3. Target (Enterprise) Architecture — Phase 2+

| Layer | MVP | Target |
|---|---|---|
| Frontend | Next.js on Vercel | Next.js (same) |
| Backend API | Next.js Route Handlers | Dedicated .NET API (extracted from `lib/`) |
| Database | Supabase Postgres | Azure SQL (schema-compatible migration) |
| Auth | Supabase Auth | Microsoft Entra ID (workforce + B2C) |
| Storage | Supabase Storage | Azure Blob Storage |
| AI | Azure OpenAI | Azure OpenAI (unchanged) |
| Queue/Cache | pgmq / jobs table | Redis (job queue + caching) |
| Monitoring | Sentry + Vercel Analytics | Application Insights |
| Tenant integration | none | Microsoft Graph + Purview read APIs for tenant discovery |

The migration path is intentionally incremental: swap one adapter (`lib/auth`, `lib/storage`, `lib/db`) at a time behind stable interfaces, rather than a rewrite.

## 4. Data Model

See `docs/ERD.md` for the full entity-relationship diagram and table definitions. Core entities: `accounts`, `users`, `projects` (intake data), `services_in_scope`, `deliverables`, `deliverable_versions`, `knowledge_base_entries`, `prompt_templates`.

## 5. API Surface

See `docs/openapi.yaml` for the MVP REST API specification covering auth-adjacent account endpoints, projects, deliverables, generation jobs, and knowledge base admin endpoints.

## 6. Security & Compliance Considerations (MVP)

- No customer tenant credentials are collected or stored in MVP (no live Graph/Purview access yet) — this significantly reduces MVP security scope.
- All project/customer data protected by Postgres RLS scoped to account ownership.
- Secrets (Azure OpenAI keys, Stripe keys) managed via Vercel environment variables, never committed.
- Generated deliverables always carry the AI-disclaimer (PRD FR-7) — a product requirement with a compliance/liability rationale, not just UX.
- SOC 2 Type II is out of scope for MVP but should be scoped as a Phase 2/3 project once Enterprise-tier sales conversations require it.
- **Fixed: PostgREST filter injection in knowledge-base retrieval.** `getRelevantKnowledgeBaseEntries` previously built a Supabase `.or()` filter via raw template-literal interpolation of the project's free-text `industry` field (no closed enum at the Zod layer — "Other" is a legitimate value). A value containing Postgrest filter syntax (comma, dot, parenthesis) reached the query unescaped. Found during a red-team review; fixed by fetching matching `service_type` rows and filtering by `industry` in application code instead of a filter string, removing the injection vector entirely rather than trying to escape it correctly. Blast radius was always limited to `knowledge_base_entries` (public-to-every-authenticated-user content, not account-scoped) — that was the query's own nature, not a control, and the same pattern anywhere near an account-scoped table would have been a real cross-tenant leak.
- **Terms of Service and Privacy Policy** now exist (`/terms`, `/privacy`) — first drafts, explicitly labeled as not yet reviewed by counsel, with bracketed placeholders for the legal entity name, governing jurisdiction, and contact address. Linked from login, signup, and Settings. Previously there was no legal basis published anywhere for processing a customer's (or their client's) data — a hard blocker for onboarding anyone beyond the design partner.

## 7. Open Technical Questions

- Vector search for Knowledge Base retrieval: needed once KB grows past what tag-filtering can serve well — likely `pgvector` on Supabase before introducing a dedicated vector DB.
- Real-time collaborative editing on deliverables (multiple reviewers) is out of scope for MVP; TipTap supports it later via Yjs if needed.
- Exact boundary for when to extract the backend into a dedicated .NET service (team size, request volume, or specific enterprise security requirement — whichever comes first).
