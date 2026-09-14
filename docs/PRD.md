# PurviewPilot.ai — Product Requirements Document (PRD)

**Status:** Draft v1
**Owner:** Mike
**Last updated:** 2026-09-14

## 1. Summary

PurviewPilot.ai is an AI-powered SaaS platform for Microsoft 365 Security, Compliance, and Purview consultants. A consultant completes a guided questionnaire about a customer engagement (industry, user count, licensing, project scope) and PurviewPilot generates client-ready deliverables — executive summaries, SOWs, architecture designs, implementation plans, testing procedures, and runbooks — in minutes instead of hours.

PurviewPilot does not replace the consultant. It replaces the 6-12 hours of documentation work that follows 2 hours of technical work, so one consultant can carry the documentation output of a full team.

## 2. Problem Statement

Microsoft security/compliance engagements are documentation-heavy and the documents are highly repetitive across customers. Consultants re-create near-identical SOWs, HLDs, LLDs, DLP designs, retention strategies, and runbooks by hand for every engagement, which produces:

- Lost billable hours (documentation crowds out technical work)
- Inconsistent quality across consultants and engagements
- Longer project timelines and slower customer onboarding
- Consultant burnout
- Reduced margins for independent consultants and MSPs

## 3. Goals (MVP)

1. Let a consultant go from a completed intake questionnaire to a first draft of 2-3 core deliverables in under 10 minutes.
2. Produce deliverables that require light editing, not rewriting, before being client-ready.
3. Prove consultants will pay for this (validate willingness-to-pay before building the full enterprise stack).
4. Establish the data model and document pipeline so additional document types and the future tenant-integration roadmap can be added without a rewrite.

### Non-Goals (MVP)

- Microsoft Graph / Purview tenant discovery (Phase 2+)
- Full 15-document deliverable catalog (Phase 2+)
- Team/partner multi-seat management (Phase 2+)
- SOC 2 / enterprise compliance certification (required before Enterprise tier, not MVP)

## 4. Target Users

**Primary:** Independent M365 consultants, Microsoft Partners, MSPs, solution integrators, security architects, compliance specialists who bill $150-250/hr and currently write these documents by hand.

**Secondary (later):** Internal IT security/compliance teams at healthcare, finance, government, defense, legal, and insurance organizations running Purview/Defender/Entra ID programs.

## 5. User Journey (MVP)

1. Consultant signs up, selects a plan.
2. Consultant starts a new **Project** and completes the **Intake Questionnaire**: customer name, industry, user count, licensing (M365 E3/E5/etc.), geographic locations, compliance requirements.
3. Consultant selects **Services in Scope** from a checklist (DLP, Retention, Sensitivity Labels, Data Lifecycle Management, Insider Risk, eDiscovery, Information Protection, Communication Compliance).
4. Consultant selects which deliverables to generate from the MVP set (Executive Summary, Statement of Work, High-Level Design).
5. Platform generates drafts using the AI Generation Engine + Knowledge Base templates.
6. Consultant reviews each deliverable in-app, edits inline, and exports as DOCX/PDF.
7. Consultant downloads the package or re-generates a section with adjusted inputs.

Target elapsed time: 30-60 minutes total (matches vision doc), with MVP focused on getting steps 4-6 solid for 2-3 doc types first.

## 6. Functional Requirements (MVP)

### 6.1 Project Intake
- FR-1: User can create a Project with customer name, industry (enum + "other"), user count, licensing tier, geographic locations, and free-text compliance notes.
- FR-2: User can edit intake fields after creation; edits should not silently invalidate already-generated deliverables (show a "source data changed, regenerate?" prompt).

### 6.2 Service Selection
- FR-3: User selects one or more services in scope from a fixed checklist (see §5, step 3).
- FR-4: Selected services drive which template sections are included in generated deliverables (e.g., selecting DLP adds a DLP section to the HLD).

### 6.3 AI Generation Engine
- FR-5: System generates deliverable drafts by combining: intake data + selected services + a deliverable-specific prompt template + relevant Knowledge Base reference content.
- FR-6: Each generated deliverable is versioned; regenerating creates a new version rather than overwriting silently.
- FR-7: Every generated deliverable displays a visible disclaimer: AI-generated draft, requires consultant review before client delivery — not certified compliance advice.

### 6.4 Deliverable Engine
- FR-8: MVP supports exactly 3 deliverable types: Executive Summary, Statement of Work, High-Level Design.
- FR-9: User can edit generated content inline (rich text) before export.
- FR-10: User can export a deliverable as DOCX and PDF, using the consultant's/firm's branding (logo, colors) if configured.
- FR-11: Deliverables are generated from structured templates (headings/sections fixed per doc type), not free-form AI text dropped into a blank document — this keeps formatting and structure consistent.

### 6.5 Knowledge Base
- FR-12: Admin-managed library of reference content (best practices, reference architectures, regulatory guidance snippets) tagged by service type and industry, retrievable by the generation engine.
- FR-13: Knowledge Base entries are versioned and attributed, so generated content can be traced back to its source reference.

### 6.6 Accounts & Billing
- FR-14: Email/password and SSO (Google, Microsoft) sign-up and login.
- FR-15: Stripe-based subscription billing with Consultant ($49/mo) and Professional ($99/mo) tiers at MVP (Partner/Enterprise tiers deferred until multi-seat support exists).
- FR-16: Usage limits per tier (e.g., number of projects or generations per month) enforced server-side.

## 7. Non-Functional Requirements

- **Accuracy & liability:** Every deliverable is explicitly labeled as an AI-generated draft requiring human review; no deliverable is presented as certified compliance guidance. Knowledge Base content must be sourced and reviewable by an admin.
- **Performance:** A single deliverable generation completes in under 60 seconds (p95).
- **Data handling:** Customer/project data (which may reference regulated industries) is stored encrypted at rest; access is scoped per consultant account. No customer tenant credentials are collected in MVP (no live Graph/Purview access yet).
- **Availability:** Best-effort for MVP (no formal SLA); target 99% uptime.
- **Auditability:** Every generated document version records the prompt template version, Knowledge Base entries used, and generation timestamp.

## 8. Success Metrics

- Time from intake completion to first exported deliverable (target: <10 min).
- % of generated deliverables exported without a full rewrite (proxy: edit distance between generated and exported version).
- Trial-to-paid conversion rate.
- Monthly active projects per paying user (engagement/retention signal).

## 9. Roadmap Beyond MVP

- **Phase 2:** Full deliverable catalog (LLD, DLP Design, Retention Strategy, Sensitivity Labeling Plan, Testing Guide, UAT Plan, Rollback Procedures, Runbooks, CAB Requests, Change Management docs, Compliance Reports), PPTX export, Partner/Enterprise multi-seat tiers.
- **Phase 3:** Microsoft Graph + Purview read-only integration for tenant discovery, feeding automatic environment analysis into deliverable generation (this is the long-term moat described in the vision doc).
- **Phase 4:** Automatic architecture and roadmap generation from live tenant state; SOC 2 Type II for enterprise/federal customers.

## 10. Open Questions

- Exact Knowledge Base sourcing process at launch (who authors/reviews the first version of reference content)?
- Branding/white-label requirements for MSP/Partner tier — how soon is this needed?
- Regulatory review process: should a compliance SME review Knowledge Base content before it ships, given healthcare/gov/defense use cases?
