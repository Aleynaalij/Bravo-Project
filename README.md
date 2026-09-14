# PurviewPilot.ai

AI-powered SaaS platform for Microsoft 365 Security, Compliance, and Purview consultants. A consultant completes a guided intake questionnaire and PurviewPilot generates client-ready deliverables (executive summaries, SOWs, architecture designs, and more) in minutes instead of hours.

## Planning Documents

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/TDD.md`](docs/TDD.md) — Technical Design Document (MVP + target architecture)
- [`docs/openapi.yaml`](docs/openapi.yaml) — OpenAPI specification (MVP API surface)
- [`docs/ERD.md`](docs/ERD.md) — Database ERD
- [`docs/sprint-1-plan.md`](docs/sprint-1-plan.md) — Sprint 1 implementation plan

## Stack (MVP)

Next.js (TypeScript, Tailwind) on Vercel, Supabase (Postgres + Auth + Storage), Azure OpenAI, Stripe. See `docs/TDD.md` for the full architecture and the migration path to the target enterprise stack (.NET API, Azure SQL, Entra ID, Redis, Application Insights).

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in a Supabase project's URL/anon key (Azure OpenAI, Stripe, and Sentry values aren't required until later sprints).
2. Apply the database schema: run the SQL files in `supabase/migrations/` in order (`0001_init.sql`, `0002_rls.sql`, `0003_auth_trigger.sql`) against that Supabase project — via the Supabase SQL editor or `supabase db push` if using the CLI.
3. In the Supabase project's Auth settings, enable the Microsoft (Azure) OAuth provider if you want that login path working locally.
4. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Visit `http://localhost:3000` — it redirects to `/login`. Sign up, confirm the email (or disable email confirmation in Supabase Auth settings for local dev), and you'll land on `/dashboard`.

## Project Structure

- `src/app/` — routes (App Router): `login`, `signup`, `auth/callback`, `dashboard`
- `src/lib/supabase/` — Supabase client adapters (browser, server, proxy/middleware session refresh) — see `docs/TDD.md` §2.4 for why these are isolated behind a thin adapter
- `src/lib/domain/enums.ts` — service/deliverable type enums, kept in sync with `docs/openapi.yaml` and `docs/ERD.md`
- `src/lib/validation/` — Zod schemas matching the OpenAPI request/response shapes
- `supabase/migrations/` — SQL schema and RLS policies matching `docs/ERD.md`
