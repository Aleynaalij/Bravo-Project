# PurviewPilot.ai — Technical Design Document (TDD)

**Status:** Draft v1
**Scope:** MVP architecture (lean stack) + target enterprise architecture
**Last updated:** 2026-09-14

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

### 2.2 Backend
- MVP backend logic lives in **Next.js Route Handlers and Server Actions** — no separate service to deploy/operate at MVP scale. All business logic (generation orchestration, template rendering, export) is organized into a `lib/` module layer with no framework dependencies, so it can be extracted into a standalone API service later with minimal churn.
- Background jobs (document generation, export rendering) run via a queue-backed worker (see §2.5) rather than inline in the request, since generation can take up to ~60s.

### 2.3 Database — Supabase Postgres
- Chosen over Azure SQL for MVP because it bundles Postgres + Auth + Storage + row-level security in one managed service, cutting setup time significantly. Schema is standard relational SQL; migrating to Azure SQL later is a schema-compatible port, not a redesign (see ERD.md — no Postgres-only features are used in core tables besides `jsonb`, which maps to `nvarchar(max)` + JSON functions in SQL Server if needed).
- Row-Level Security (RLS) policies scope every table to the owning consultant/account from day one — this is also what makes the eventual multi-tenant Partner/Enterprise tier straightforward.

### 2.4 Auth
- **Supabase Auth** (email/password + Google + Microsoft OAuth) for MVP.
- Target architecture swaps/extends this to **Microsoft Entra ID** (including Entra ID B2C or workforce tenant SSO) once Partner/Enterprise customers need enterprise SSO and conditional access — the auth provider is isolated behind a thin adapter in `lib/auth/` for exactly this reason.

### 2.5 AI Generation Engine
- **Azure OpenAI (GPT-4o or later)** is the target provider, not a generic OpenAI API key — customers in healthcare/gov/defense care about data residency and Microsoft's enterprise data handling terms, and this is a differentiator worth having.
  - **Implemented (Epic D):** provider is isolated behind one function, `src/lib/ai/provider.ts`. It currently defaults to a standard OpenAI API key (`OPENAI_API_KEY`) as a temporary substitute to unblock testing without an Azure subscription, falling back to Azure OpenAI if that key isn't set. **Revert to Azure OpenAI before any real federal customer** (Bravo Consulting Group, PRD §11) — data residency and Microsoft enterprise terms don't apply to a standard OpenAI key. Switching is an env var change, not a code change.
- Generation flow (as implemented):
  1. Route Handler / Server Action receives a "generate deliverable" request.
  2. Assembles a prompt from: intake data (structured) + selected services + deliverable-specific prompt template (versioned, stored in `prompt_templates`) + relevant Knowledge Base snippets (retrieved by service/industry tags — simple filtered query at MVP, not a vector store; revisit if KB grows large enough to need semantic retrieval).
  3. Calls the AI provider, parses the structured response (JSON matching the deliverable's section schema — see §2.6), stores it as a new deliverable version.
  4. Runs synchronously within the request (see `src/lib/generation/run.ts`'s docstring) rather than through a separate worker — `generation_jobs` and `deliverables.status` still track state accurately, so this is swappable for a real queue later without changing the write shape.
- Queue: **not yet built.** Fine at MVP's 1-3 deliverables-per-request scale; revisit (Supabase `pgmq`, or a `jobs` table polled by Vercel Cron) once generation needs to run outside the request/response cycle (e.g., generating the full Phase-2 deliverable catalog at once).

### 2.6 Deliverable / Document Templates
- Each deliverable type (Executive Summary, SOW, HLD, plus DLP Design/Retention Strategy/Sensitivity Labeling Plan added Sprint 2 — see PRD §9 Phase 2) has a **structured template**: a fixed set of sections, each with its own prompt fragment and expected output schema (e.g., `{ heading: string, paragraphs: string[] }[]`).
- AI output is validated against this schema (Zod) before being accepted — this is what keeps generated docs formatted consistently rather than free-form prose, per PRD FR-11.
- **DOCX export:** `docx` npm package (`src/lib/export/docx.ts`), populating a firm-branded template (logo/colors read from `branding` if set — no settings UI exists yet to set it, so this is forward-compatible rather than exercised today).
- **PDF export:** `@react-pdf/renderer` (`src/lib/export/pdf.tsx`) rather than the Puppeteer approach originally planned here — a pure-JS renderer avoids bundling headless Chromium into a Vercel serverless function, a real deployment-size/cold-start risk. Revisit if a future deliverable type needs HTML/CSS fidelity this can't express.
- **Download flow (implemented, Epic E):** `GET /api/projects/{id}/deliverables/{deliverableId}/export?format=docx|pdf|pptx` streams the file directly rather than uploading to Storage first — exports are cheap to regenerate from `deliverable_versions.content` on every request, so the Storage/signed-URL round trip in §2.7 below isn't needed for this. `docs/openapi.yaml` updated to match.
- **PPTX export (Sprint 2):** `pptxgenjs` (`src/lib/export/pptx.ts`) — a title slide, then one or more content slides per section (paragraphs become bullets, split across slides once a section overflows a character budget). This is a slide deck, not a page-for-page reflow of the DOCX/PDF — same content, presentation-appropriate layout. Note: `pptxgenjs`'s image-embedding path pulls in a transitive `image-size` version with a known DoS advisory (icon/JXL/HEIF parsers); not exploitable today since this module never embeds an image (no branding-logo upload UI exists yet), but worth re-checking when logo embedding ships.

### 2.7 Storage
- **Supabase Storage** for uploaded assets (firm logos) and any future case where a file needs to persist rather than be regenerated on demand, with per-account access policies. Swappable for Azure Blob Storage later behind a thin storage adapter (`lib/storage/`). Not used for DOCX/PDF exports — see §2.6.

### 2.8 Billing
- **Stripe** subscriptions (Checkout + Customer Portal + webhooks) for Consultant/Professional tiers. **Implemented (Sprint 2).**
- `subscriptions` is read-only for the account under RLS (docs/ERD.md) — writes happen server-side via `src/lib/supabase/admin.ts`, a service-role client that bypasses RLS entirely. This is the app's first use of the service role; used only in the checkout/portal Route Handlers and the Stripe webhook handler (which has no user session to write under at all). Never import this client into a Client Component or otherwise expose the key to the browser.
- Price IDs (`STRIPE_PRICE_ID_CONSULTANT`/`STRIPE_PRICE_ID_PROFESSIONAL`) come from Products/Prices created in the Stripe Dashboard — this app can't provision those itself, same class of external-account dependency as the Azure OpenAI deployment (docs/PRD.md §11).
- Usage limits per tier (PRD FR-16) are **not implemented** — no numeric limits have been decided yet (how many projects/generations per plan). Everything up through Stripe subscription tracking is built; enforcing limits is a separate follow-up once those numbers are chosen.

### 2.9 Hosting & Ops
- **Vercel** for the Next.js app (frontend + Route Handlers).
- **Sentry** for error tracking, **Vercel Analytics** for basic usage — a lightweight substitute for Application Insights at MVP scale; swap-in candidate for Phase 2 if the product needs Azure-native monitoring for enterprise sales conversations.

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

## 7. Open Technical Questions

- Vector search for Knowledge Base retrieval: needed once KB grows past what tag-filtering can serve well — likely `pgvector` on Supabase before introducing a dedicated vector DB.
- Real-time collaborative editing on deliverables (multiple reviewers) is out of scope for MVP; TipTap supports it later via Yjs if needed.
- Exact boundary for when to extract the backend into a dedicated .NET service (team size, request volume, or specific enterprise security requirement — whichever comes first).
