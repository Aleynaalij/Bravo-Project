# QuePilot.ai — Product Requirements Document (PRD)

**Status:** Draft v1
**Owner:** Mike
**Last updated:** 2026-09-15

## 1. Summary

QuePilot.ai (formerly PurviewPilot — renamed once the platform expanded beyond Purview to cover a full Microsoft consulting practice's service areas, see §12) is an AI-powered SaaS platform for Microsoft technology consultants — spanning Data Security & Compliance, Cloud Migration, App Modernization, SharePoint, and Analytics/Data/AI. A consultant completes a guided questionnaire about a customer engagement (industry, user count, licensing, project scope) and QuePilot generates client-ready deliverables — executive summaries, SOWs, architecture designs, implementation plans, testing procedures, and runbooks — in minutes instead of hours.

QuePilot does not replace the consultant. It replaces the 6-12 hours of documentation work that follows 2 hours of technical work, so one consultant can carry the documentation output of a full team.

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
- FR-16: Usage limits per tier (e.g., number of projects or generations per month) enforced server-side. **Deliberately deferred (decision, not an oversight):** Stripe billing tracks plan/subscription status (Sprint 2), but no numeric limits are enforced — every account has unlimited access regardless of plan. Holding off until there's real usage data to size limits against, rather than guessing numbers now.

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

- **Phase 2:** Full deliverable catalog (LLD, DLP Design, Retention Strategy, Sensitivity Labeling Plan, Testing Guide, UAT Plan, Rollback Procedures, Runbooks, CAB Requests, Change Management docs, Compliance Reports) — ✅ **complete (Sprint 2)**, all 14 types built and DB-verified, live AI generation still pending (see docs/validation-checklist.md). PPTX export — ✅ complete (Sprint 2). Multi-seat teams — ✅ **complete** (see §11 update below); a distinct Partner/Enterprise *billing tier* on top of that is still not started (no Stripe Product/Price for it, and seat count isn't metered — same "no numeric limits without real usage data" stance as FR-16).
- **Phase 3:** Microsoft Graph + Purview read-only integration for tenant discovery, feeding automatic environment analysis into deliverable generation (this is the long-term moat described in the vision doc).
- **Phase 4:** Automatic architecture and roadmap generation from live tenant state; SOC 2 Type II for enterprise/federal customers.

## 10. Open Questions

- Exact Knowledge Base sourcing process at launch (who authors/reviews the first version of reference content)?
- Branding/white-label requirements for MSP/Partner tier — how soon is this needed?
- Regulatory review process: should a compliance SME review Knowledge Base content before it ships, given healthcare/gov/defense use cases?

## 11. Design Partner Notes

The reference design partner this MVP was validated against is an 11-50 person Microsoft Solutions Partner (Modern Work) doing Cloud Migration, App Modernization, SharePoint, Data Security (Purview + Azure Policy + Defender for Cloud), Records Management, and Analytics/AI work for federal, defense, intelligence, and commercial clients. Two things from that profile feed directly back into MVP scope:

- **Federal/defense compliance frameworks take priority in the Epic C Knowledge Base.** The design partner's client base is federal/IC-heavy, not just commercial. KB seed content (docs/sprint-1-plan.md Epic C) should lead with FedRAMP, NIST 800-53, CMMC, and FISMA reference material alongside commercial frameworks (HIPAA, GDPR) — not commercial-only. The intake form's compliance notes field already reflects this (placeholder text updated).
- **Multi-seat is a real gap for a firm this size, not just a Phase 2 nicety.** A firm that size getting one individual MVP account doesn't get the firm using the product. **Resolved:** multi-seat teams shipped post-MVP — an account owner can invite teammates (`/dashboard/settings`, Team section) who share full access to that account's projects and deliverables. No seat limit and no separate Partner-tier price; this is about the whole team working from one account, not a new billing SKU (that's still open, see §9/§10).

Security/compliance documentation is one service line among several at a firm like this (Cloud Migration and SharePoint look like bigger practice areas) — the MVP covered a slice of a design partner's engagement types by design, not their whole practice. **Decision (post-MVP): expand to the whole practice.** Mike asked explicitly for the platform to cover everything sweepable from the design partner's public site, not just the Purview slice — see §12.

## 12. Practice-Area Expansion

The platform originally covered only the design partner's Data Security & Compliance practice (Microsoft Purview — the 8 original service types). This expansion adds one service per the firm's other named practice areas, so the platform reflects a whole Microsoft consulting practice rather than one service line. This platform is not built for or tied to any single consulting firm — the design partner's profile shaped the initial scope, but the product itself is customer-agnostic; any Microsoft consulting practice is the intended user.

Sourced from the design partner's public site via web search (this environment's network egress policy blocks directly fetching that site, so this is search-indexed content, not a live site crawl — worth a direct pass once that's unblocked to confirm nothing changed or was missed):

- **Cloud Migration** (`cloud_migration`) — the design partner's "Cloud Services" / "Cloud Migration" pages: Microsoft 365 & Azure migration, described as "secure migration to AI-powered collaboration."
- **App Modernization** (`app_modernization`) — Power Platform (low-code) + Azure DevOps, "transforms legacy applications into scalable, AI-ready solutions."
- **SharePoint** (`sharepoint`) — "end-to-end SharePoint services, from strategy to governance," explicitly named as security/compliance/productivity-focused, not just migration.
- **Analytics, Data & AI** (`analytics_ai`) — Azure, Microsoft Fabric, Purview (data-governance angle, distinct from the Purview *security* services already covered), and Microsoft Copilot integration/governance.

Firm facts surfaced along the way, useful for Knowledge Base tone/positioning: Microsoft Solutions Partner (Modern Work) *and* a Certified AvePoint Professional Services (CAPS) Partner; founded 2007; offices in Virginia, West Virginia, and El Salvador; 3M+ users across client environments, 30 of 50 US states; Minority-Owned Small Business with a federal/defense/intelligence government-contracting track record (separate from the Modern Work partner status).

Each new practice area gets exactly one flagship deliverable type (`cloud_migration_plan`, `app_modernization_plan`, `sharepoint_governance_plan`, `data_analytics_strategy`), gated to its service the same way DLP Design is gated to `dlp` — matching Purview's per-service "design" deliverable pattern rather than the deeper 3-4-deliverable depth Purview itself got. Revisit if a practice area needs Testing Guide/Runbooks-level depth later; the existing "always offered, itemize by service" documents (SOW, Testing Guide, UAT Plan, etc.) already generalize across all 12 services without needing practice-area-specific versions.

**Rename: PurviewPilot → BravoPilot → QuePilot.** Once the practice-area expansion made "Purview" in the name misleading, Mike asked for naming suggestions; after a quick collision check against existing products (several names in the "-Pilot" family turned out to already be taken — ScopePilot, TenantPilot, StackPilot, PracticePilot), he chose **BravoPilot**. Renamed throughout the codebase and docs at that time. A second rename followed once the product's actual owner confirmed the platform isn't built for or tied to any single named consulting firm (it's a standalone product, and this design partner's data doesn't extend to real tenant/customer information): **BravoPilot → QuePilot**, with the same "same look, same logos, name only" scope — see the git history around 2026-09-18 for the full diff. The deployed Vercel domain and Supabase project name are still literally `purviewpilot-*` — renaming those too is confirmed wanted, just not urgent. Deferred rather than done, and out of reach from this environment regardless (no Vercel MCP access to that project; no project-rename operation in the Supabase MCP tools available here) — see docs/sprint-1-plan.md for what's actually involved whenever it's picked up.
