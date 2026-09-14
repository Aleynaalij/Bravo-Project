# PurviewPilot.ai — Sprint 1 Implementation Plan

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
| # | Task | Notes |
|---|---|---|
| C1 | Draft prompt template + section schema for Executive Summary | Owner: Mike (domain content); stored in `prompt_templates` |
| C2 | Draft prompt template + section schema for Statement of Work | Same |
| C3 | Draft prompt template + section schema for High-Level Design | Same — HLD sections should vary by services in scope (e.g., DLP section only if DLP selected) |
| C4 | Seed `knowledge_base_entries` with initial reference content per service type | Minimum: 1-2 entries per service type selected in Sprint 1 test projects |
| C5 | Seed migration + admin script to load C1-C4 into the DB | No admin UI yet — direct SQL/seed script |

### Epic D — AI Generation Pipeline
| # | Task | Notes |
|---|---|---|
| D1 | Azure OpenAI resource provisioning + API wiring | Store key in Vercel env vars |
| D2 | `generation_jobs` table + simple queue (Postgres-polled worker or Vercel Cron) | Per TDD §2.5 |
| D3 | `POST /api/projects/{id}/generate` — enqueue job(s) | |
| D4 | Worker: assemble prompt (intake + services + template + KB snippets), call Azure OpenAI, validate response against section schema (Zod), write `deliverable_versions` row | Core of the product — needs the most testing |
| D5 | `GET /api/generation-jobs/{id}` polling endpoint (or Supabase Realtime subscription) | |
| D6 | Error handling: failed generation surfaces a clear error, job marked `failed`, does not silently create a broken deliverable | |

### Epic E — Deliverable Review, Edit & Export
| # | Task | Notes |
|---|---|---|
| E1 | Deliverable viewer UI rendering structured section content | |
| E2 | TipTap rich-text editor for inline edits | Saves as new `deliverable_versions` row, `source = consultant_edited` |
| E3 | AI-disclaimer banner on every generated deliverable | FR-7 — non-negotiable, ships with E1 |
| E4 | DOCX export via `docx` npm package, using branding if set | `POST /api/projects/{id}/deliverables/{id}/export` |
| E5 | PDF export via Puppeteer render of the same section content | |
| E6 | Download flow (signed Supabase Storage URL) | |

## Suggested Sequencing (2-week sprint)

- **Days 1-3:** Epic A (foundation) — must be done first, everything depends on it.
- **Days 3-5:** Epic B (intake/services) in parallel with Epic C (prompt/KB content drafting — this is domain-expert work, doesn't block on infra).
- **Days 5-9:** Epic D (generation pipeline) — the highest-risk, highest-value work; start as soon as A and C1-C3 (at least one template) are ready.
- **Days 8-11:** Epic E (review/edit/export) — starts once D4 produces real deliverable content to render against.
- **Days 11-14:** Integration testing of the full loop (signup → intake → generate → edit → export), bug fixing, deploy to a shared staging environment for Mike to review.

## Definition of Done (Sprint 1)

- A new user can sign up, create a project, select services, generate all 3 MVP deliverable types, see the AI disclaimer, edit content inline, and download both DOCX and PDF.
- RLS verified: one account cannot see another account's projects/deliverables via API or direct DB query.
- Generation failures are handled gracefully (visible error, no orphaned/broken deliverable records).
- Core flow deployed to a staging Vercel environment connected to a staging Supabase project.

## Risks / Things to Watch

- **Prompt/template quality (Epic C) is the actual product** — this is domain expertise, not engineering, and is the most likely thing to take longer than estimated. Recommend starting C1-C3 on day 1 in parallel with infra, not after.
- **Structured-output reliability from the LLM** — validate early (D4) that Azure OpenAI reliably returns content matching the section schema; budget time for prompt iteration and retry/repair logic if it doesn't.
- **Scope discipline** — it will be tempting to add a 4th deliverable type or the KB admin UI mid-sprint. Hold the line; those are Sprint 2.
