# BravoPilot.ai — Sprint 1 Implementation Plan

**Status:** Draft v1
**Sprint length:** 2 weeks
**Goal:** A consultant can sign up, complete a project intake, select services, generate a first draft of the Executive Summary, Statement of Work, and High-Level Design, edit them, and export DOCX/PDF. This is the full MVP core loop end-to-end for 3 deliverable types — everything else (Knowledge Base admin UI, billing, remaining doc types) follows in later sprints.

## Sprint 1 Scope

In scope:
- Project scaffolding (Next.js + Supabase wired up, deployed to Vercel)
- Auth (Supabase Auth, email/password + Microsoft OAuth)
- Project intake CRUD (FR-1, FR-2)
- Service selection (FR-3, FR-4)
- Prompt templates + Knowledge Base seed data for exactly 3 deliverable types (seeded via migration, not an admin UI yet)
- AI generation pipeline for Executive Summary, SOW, High-Level Design (FR-5, FR-6, FR-7)
- Deliverable review/edit UI (FR-9)
- DOCX + PDF export (FR-10, FR-11)

Out of scope (explicitly deferred):
- Stripe billing (accounts are unmetered/free during Sprint 1-2; billing is Sprint 3+)
- Knowledge Base admin UI (KB is seeded via SQL migration for Sprint 1)
- Any deliverable type beyond the 3 listed
- PPTX export
- Multi-seat accounts

## Work Breakdown

### Epic A — Foundation
| # | Task | Notes |
|---|---|---|
| A1 | Initialize Next.js 14 app (TypeScript, Tailwind, shadcn/ui) in this repo | App Router, `lib/` module layer per TDD §2.2 |
| A2 | Provision Supabase project; wire env vars in Vercel | Dev + prod projects |
| A3 | Write initial schema migration from `docs/ERD.md` | `accounts, users, branding, subscriptions, projects, project_services, deliverables, deliverable_versions, deliverable_version_kb_entries, knowledge_base_entries, prompt_templates, generation_jobs` |
| A4 | Apply RLS policies per ERD §"Row-Level Security" | Verify with a negative test (account A cannot read account B's project) |
| A5 | Set up Supabase Auth (email/password + Microsoft OAuth) | Account row auto-created on first login (DB trigger or Next.js callback) |
| A6 | Set up Sentry + Vercel Analytics | Minimal MVP monitoring per TDD §2.9 |

### Epic B — Project Intake & Service Selection
| # | Task | Notes |
|---|---|---|
| B1 | Intake form UI (customer name, industry, user count, licensing tier, locations, compliance notes) | Matches `ProjectCreate` schema in OpenAPI |
| B2 | `POST /api/projects`, `GET /api/projects`, `GET/PATCH/DELETE /api/projects/{id}` | Zod validation matching OpenAPI schemas |
| B3 | Service selection checklist UI + `PUT /api/projects/{id}/services` | 8 services per ERD `project_services` |
| B4 | Project list/dashboard view | Server Component, paginated |

### Epic C — Knowledge Base Seed & Prompt Templates
| # | Task | Status | Notes |
|---|---|---|---|
| C1 | Draft prompt template + section schema for Executive Summary | ✅ Done | `supabase/migrations/0005_epic_c_seed.sql`, v1, active |
| C2 | Draft prompt template + section schema for Statement of Work | ✅ Done | Same migration, v1, active |
| C3 | Draft prompt template + section schema for High-Level Design | ✅ Done | Same migration, v1, active — 8 of 14 sections are conditional on services in scope |
| C4 | Seed `knowledge_base_entries` with initial reference content per service type | ✅ Done | 13 entries: one commercial + one Government/federal-framework entry (FedRAMP, NIST 800-53, CMMC, NISPOM) for the 5 services where that distinction matters most (DLP, retention, sensitivity labels, insider risk, information protection); one commercial-only entry for the remaining 3 |
| C5 | Seed migration + admin script to load C1-C4 into the DB | ✅ Done | Applied to the live Supabase project and verified via query |

Content is Claude's first pass, not a substitute for compliance review before any of it reaches a real client — see PRD §10 open question on regulatory review process. Epic D (AI Generation Pipeline) is what actually calls these templates — not built yet.

**KB parity fill (post-launch):** C4's original 13-entry seed left `data_lifecycle_management`, `insider_risk_management`, `ediscovery`, `information_protection`, and `communication_compliance` with only 1-2 entries each, versus the 3-entry (2 general + 1 Government) pattern every other service in the catalog follows — a real content gap found by querying the live table, not a hypothetical one. `supabase/migrations/0016_kb_parity_fill.sql` adds the 8 missing entries; the knowledge base is now a consistent 3 entries × 12 services = 36 rows total.

### Epic D — AI Generation Pipeline
| # | Task | Status | Notes |
|---|---|---|---|
| D1 | Azure OpenAI resource provisioning + API wiring | ⚠️ Temp substitute | Using a standard `OPENAI_API_KEY` for now (falls back to Azure OpenAI automatically if unset) — see docs/TDD.md §2.5. Revert to Azure OpenAI before any real federal customer |
| D2 | `generation_jobs` table + simple queue (Postgres-polled worker or Vercel Cron) | ✅ Done (no separate worker) | Table exists since Epic A; runs synchronously in-request rather than through a queue — fine at MVP scale, see `run.ts` docstring |
| D3 | `POST /api/projects/{id}/generate` — enqueue job(s) | ✅ Done | |
| D4 | Worker: assemble prompt (intake + services + template + KB snippets), call Azure OpenAI, validate response against section schema (Zod), write `deliverable_versions` row | ✅ Built, ⚠️ not live-tested | Every write verified against the live DB; the actual AI call itself is untested pending a working API key |
| D5 | `GET /api/generation-jobs/{id}` polling endpoint (or Supabase Realtime subscription) | ✅ Done | |
| D6 | Error handling: failed generation surfaces a clear error, job marked `failed`, does not silently create a broken deliverable | ✅ Done | |

### Epic E — Deliverable Review, Edit & Export
| # | Task | Status | Notes |
|---|---|---|---|
| E1 | Deliverable viewer UI rendering structured section content | ✅ Done | |
| E2 | Inline editor for deliverable content | ✅ Done (not TipTap) | Plain heading/paragraph fields instead of TipTap — see docs/TDD.md §2.1 for why. Saves as new `deliverable_versions` row, `source = consultant_edited` |
| E3 | AI-disclaimer banner on every generated deliverable | ✅ Done | FR-7 |
| E4 | DOCX export via `docx` npm package, using branding if set | ✅ Done | `GET /api/projects/{id}/deliverables/{id}/export?format=docx` (GET + direct file, not the POST + signed-URL shape originally spec'd — see docs/TDD.md §2.6) |
| E5 | PDF export via Puppeteer render of the same section content | ✅ Done (not Puppeteer) | `@react-pdf/renderer` instead — see docs/TDD.md §2.6 |
| E6 | Download flow (signed Supabase Storage URL) | ✅ Done (no Storage) | Direct file streaming instead — exports are cheap to regenerate on demand |
| E7 | Branding settings UI (firm name, logo, accent color) | ✅ Done | `/dashboard/branding`, Server Action in `src/app/dashboard/branding/actions.ts` (not the `PUT /accounts/me/branding` route `docs/openapi.yaml` describes — same REST-surface-is-aspirational convention as the rest of this app). Logo/color now actually flow into all three export builders — previously only `firm_name_override` was consumed; see docs/TDD.md §2.6 |

DOCX, PDF, and PPTX builders were sanity-checked directly, including with a real embedded logo and accent color (valid ZIP/PDF binary output confirmed via unzip/content-stream inspection, not just "didn't throw") — not yet tested through the full generate → review → download flow live, since that needs a working AI provider key.

## Suggested Sequencing (2-week sprint)

- **Days 1-3:** Epic A (foundation) — must be done first, everything depends on it.
- **Days 3-5:** Epic B (intake/services) in parallel with Epic C (prompt/KB content drafting — this is domain-expert work, doesn't block on infra).
- **Days 5-9:** Epic D (generation pipeline) — the highest-risk, highest-value work; start as soon as A and C1-C3 (at least one template) are ready.
- **Days 8-11:** Epic E (review/edit/export) — starts once D4 produces real deliverable content to render against.
- **Days 11-14:** Integration testing of the full loop (signup → intake → generate → edit → export), bug fixing, deploy to a shared staging environment for Mike to review.

## Definition of Done (Sprint 1)

- A new user can sign up, create a project, select services, generate all 3 MVP deliverable types, see the AI disclaimer, edit content inline, and download both DOCX and PDF. **Everything up to "generate" is built and deployed live; generation itself and everything after it is built and DB-verified but not yet exercised end-to-end live, pending a working AI provider key.**
- RLS verified: one account cannot see another account's projects/deliverables via API or direct DB query. ✅ Verified for accounts/projects (Epic A/B); not re-verified for the newer deliverables/generation_jobs tables specifically, though they use the same policy pattern.
- Generation failures are handled gracefully (visible error, no orphaned/broken deliverable records). ✅ Built (Epic D D6) — status transitions verified against the live DB, not yet exercised via a real failure live.
- Core flow deployed to a staging Vercel environment connected to a staging Supabase project. ✅ Deployed to `purviewpilot-live.vercel.app` / the `purviewpilot` Supabase project — not a separate staging environment, this is what we have today.

## Risks / Things to Watch

- **Prompt/template quality (Epic C) is the actual product** — this is domain expertise, not engineering, and is the most likely thing to take longer than estimated. Recommend starting C1-C3 on day 1 in parallel with infra, not after.
- **Structured-output reliability from the LLM** — validate early (D4) that Azure OpenAI reliably returns content matching the section schema; budget time for prompt iteration and retry/repair logic if it doesn't.
- **Scope discipline** — it will be tempting to add a 4th deliverable type or the KB admin UI mid-sprint. Hold the line; those are Sprint 2.

## Sprint 2 (started)

Sprint 1 (Epics A-E) is built and merged; live end-to-end verification of the generate step is still pending (Azure OpenAI is configured, first live test not yet run).

- **Knowledge Base admin UI** — ✅ Done. `/admin/knowledge-base` (create/edit/delete), gated by a new `users.is_platform_admin` flag + RLS policies (`supabase/migrations/0006_platform_admin.sql`). Chose this over expanding the deliverable catalog first: it's pure engineering with no new domain-content risk, and it's what actually unblocks maintaining/expanding Knowledge Base content going forward without a code change each time. RLS verified both directions live (non-admin write correctly rejected, admin write correctly allowed) — not just reasoned about.
- **Stripe billing** — ✅ Built, ⚠️ not live-tested. Checkout (`/dashboard/billing`), Customer Portal, and webhook handler (`/api/billing/webhook`) are all in place, matching PRD FR-15. The webhook→`subscriptions`→`accounts.plan` write path was verified directly against the live DB (exact upsert shape the handler uses), then reset. **Not yet tested live** — needs a real Stripe account with Products/Prices created and `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_ID_CONSULTANT`/`STRIPE_PRICE_ID_PROFESSIONAL` set in Vercel, same class of external-account dependency as Azure OpenAI. Usage limits per tier (FR-16) are explicitly **not implemented** — no numeric limits have been decided; right now every account has unlimited access regardless of plan.
- **Deliverable catalog expansion (part 1 of Phase 2)** — ✅ Built, ⚠️ not live-tested (AI generation). Added 3 new service-specific deliverable types: DLP Design, Retention Strategy, Sensitivity Labeling Plan (`supabase/migrations/0007_deliverable_catalog_expansion.sql` extends the `deliverable_type` enum; `0008_deliverable_catalog_content.sql` adds the prompt templates and supporting Knowledge Base entries). Each is only offered on the Generate form when the matching service (DLP / Retention / Sensitivity Labels) is in the project's scope — see `DELIVERABLE_REQUIRES_SERVICE` in `src/lib/domain/labels.ts`. DB writes (enum values, KB entries, prompt_templates rows) verified directly via SQL; the actual AI generation call for these 3 new prompts has not been run end-to-end (same Azure OpenAI live-test gap as the original 3 types).
- **PPTX export** — ✅ Done. `src/lib/export/pptx.ts` (`pptxgenjs`) adds a third download option (`?format=pptx`) alongside DOCX/PDF on every deliverable type — a title slide plus one or more content slides per section, bullets split across slides once a section overflows a character budget. Standalone-verified (built and opened a sample deck), not yet exercised through the actual app/download flow (same class of gap as DOCX/PDF at MVP). Noted a transitive dependency advisory (`image-size`, via `pptxgenjs`'s image-embedding path) that doesn't apply yet since this module never embeds an image — see TDD §2.6.
- **Deliverable catalog expansion (part 2 of Phase 2)** — ✅ Built, ⚠️ not live-tested (AI generation). Added Low-Level Design, Testing Guide, UAT Plan, Rollback Procedures (`supabase/migrations/0009_deliverable_catalog_expansion_2.sql` extends the enum; `0010_deliverable_catalog_content_2.sql` adds the 4 prompt templates). Unlike part 1, none of these 4 require a specific service — like Executive Summary/SOW/HLD, they're always offered, with per-service content driven by prompt instructions to itemize by service in scope (LLD instead reuses HLD's per-service conditional-section pattern, since its content genuinely differs per service rather than just itemizing). No new Knowledge Base entries added — KB retrieval is keyed to the project's services in scope, not deliverable type, so these already draw on the existing 16 entries. Also fixed `docs/openapi.yaml`'s `DeliverableType` enum, which had drifted out of sync since part 1 (still listed only the original 3 types).
- **Deliverable catalog expansion (part 3 of Phase 2 — catalog complete)** — ✅ Built, ⚠️ not live-tested (AI generation). Added Operational Runbooks, CAB Request, Change Management Plan, Compliance Report (`supabase/migrations/0011_deliverable_catalog_expansion_3.sql` extends the enum; `0012_deliverable_catalog_content_3.sql` adds the 4 prompt templates). This completes the full 14-type Phase 2 deliverable catalog from PRD §9. Same "always offered, itemize by service" pattern as part 2. Compliance Report carries deliberately stronger disclaimer language than the rest of the catalog — its prompt requires the model to state plainly, as actual section content (not just the closing caveat every deliverable type already has), that the report is not a certified assessment and has not been reviewed by compliance/legal/an auditor; it's the type most likely to cause real harm if a customer mistook a draft for a finished artifact.
- **UI theme** — ✅ Done, in three passes. (1) Replaced the untouched `create-next-app` scaffold with a real navy/slate theme and a shared `Header`/`Button`/`Card`/`Badge`/`Alert` component set across every page. (2) Fixed a heading/button overlap bug Mike caught live on his phone (`justify-between` with no minimum gap; fixed everywhere the pattern occurred, not just the one screenshotted). (3) Gave the UI real personality per Mike's ask for "a Microsoft feel" — a Fluent 2-inspired blue/purple-gradient theme and `@fluentui/react-icons` iconography (Microsoft's own icon set) throughout: a gradient hero banner on the dashboard, icon chips on project cards, the generate form redesigned as category-grouped module cards with a selection counter (Core/Design/Testing & Change/Compliance), and icons on every service checkbox and export button. Found and fixed two real Server-Component/Fluent-icon bugs along the way (Griffel's client-only styling hook, and a Turbopack/RSC quirk where a Server Component destructuring an icon out of a `"use client"` module's object export gets `undefined`) — both confirmed via a throwaway preview route with mock data (this sandbox can't sign in a real session to click through authenticated pages), verified against dev **and** a real production build/start, not just assumed fixed. See TDD §2.1.
- Partner/Enterprise multi-seat tiers remain not started — the only unbuilt Phase 2 item.

## Bravo Practice-Area Expansion (catalog complete)

Mike asked the platform to cover everything sweepable from bravocg.com, not just Purview — see PRD §12 for the full rationale and sourcing. This is a bigger scope change than anything in Sprint 2: the product covered exactly one of Bravo's ~5 practice areas until now.

- **Batch 1 (schema + domain model)** — ✅ Done. `supabase/migrations/0013_bravo_practice_areas.sql` adds 4 new `service_type` values (Cloud Migration, App Modernization, SharePoint, Analytics/Data/AI) and 4 new `deliverable_type` values (one flagship deliverable per new practice area, gated the same way DLP Design is gated to `dlp`). New `PRACTICE_AREA`/`SERVICE_PRACTICE_AREA` domain grouping (`labels.ts`), new Fluent icons per service/practice area, and the services checklist (intake form + project detail) regrouped by practice area.
- **Batch 2 (generalizing the shared prompts)** — ✅ Done. Before this, a project selecting only e.g. Cloud Migration would still get an Executive Summary/SOW/HLD written by "a senior Microsoft 365 security and compliance consultant," and the HLD was told to "reference actual Purview capabilities by name" regardless of what was actually in scope. `supabase/migrations/0014_generalize_core_prompts.sql` ships version-2 templates (versioned per the ERD's documented design, not an in-place edit) for all 10 previously-Purview-flavored prompts: Executive Summary, SOW, HLD, Testing Guide, UAT Plan, Rollback Procedures, Runbooks, CAB Request, Change Management, Compliance Report. HLD's `section_schema` also gains 4 new per-service design sections (one per new practice area) alongside the existing 8.
- **Batch 3 (KB content + flagship deliverables — catalog now complete)** — ✅ Done. `supabase/migrations/0015_practice_area_kb_and_deliverables.sql` adds 12 Knowledge Base entries (3 per new service — general practice guidance plus a federal/GCC High-specific entry each, matching Bravo's government-heavy client base) and prompt templates for the 4 new flagship deliverables: Cloud Migration Plan, App Modernization Plan, SharePoint Governance Plan, Data & Analytics Strategy — same 8-section depth as the original Purview design docs (DLP Design, Retention Strategy, etc.). The deliverable catalog is now 18 types across 12 services / 5 practice areas. Verified via SQL: 28 total KB entries (16 Purview + 12 new), 18 active prompt templates (exactly one per deliverable type). Not yet exercised through live AI generation (same Azure OpenAI gap noted elsewhere).
- **Resolved: renamed PurviewPilot → BravoPilot.** Flagged as an open question after the practice-area expansion made "Purview" misleading; Mike asked for suggestions, a quick collision check ruled out several taken "-Pilot" names (ScopePilot, TenantPilot, StackPilot, PracticePilot), and he chose BravoPilot. Renamed throughout code and docs — see PRD §12 for the record.
- **Deferred, not forgotten: rename the live Vercel domain and Supabase project name to match.** Both are still literally `purviewpilot-*`. Mike confirmed he does want this renamed, just not urgently. Out of reach from this environment regardless — no Vercel MCP access to that manually-created project (confirmed repeatedly this session), and the Supabase MCP tools available here have no project-rename operation. Whenever it's picked up: renaming the Vercel project (or pointing a custom domain at it) and updating the Supabase project's display name are both quick dashboard changes, not engineering work — the Supabase project's URL/ref is a random identifier independent of its display name, so renaming it there is purely cosmetic and has zero blast radius.
- **Interactive demo (`/demo`)** — ✅ Done. Mike asked for a "how to" tab, but specifically preferred a hands-on demo over a static SOPs page — "like a fake project that teaches you hands on." Built as a real interactive walkthrough, not a video or screenshots: a fictional project (Contoso Federal Services, Government, FedRAMP Moderate) with a live services checklist, a generate step, and a review/edit/export step, all wired to local component state instead of Supabase/Azure OpenAI so it needs neither a real AI call nor a database row. The service-gating behavior is real, not simulated — unchecking DLP in the demo actually removes DLP Design from the generate step, same `DELIVERABLE_REQUIRES_SERVICE` logic the real app uses. Export buttons produce genuinely real files (`/api/demo/export`, reusing the actual `buildDocx`/`buildPdf`/`buildPptx` functions against 3 hand-written canned deliverables — Executive Summary, Statement of Work, DLP Design — rather than all 18 catalog types, to keep the content-writing effort bounded). Added to the main nav. Verified end-to-end pre-merge via a throwaway no-auth preview route: Playwright drove the full flow (uncheck a service → dependent deliverable disappears; generate → loading state → results; edit → save → confirmation), and all 9 exported files (3 deliverables × 3 formats) were confirmed as valid DOCX/PDF/PPTX, not just non-empty responses.
