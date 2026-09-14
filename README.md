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
