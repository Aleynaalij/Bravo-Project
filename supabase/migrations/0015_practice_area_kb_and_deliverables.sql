-- Bravo practice-area expansion (batch 3): Knowledge Base content for the
-- 4 new services, and prompt templates for their flagship deliverable
-- types. Closes the two real gaps noted in docs/validation-checklist.md
-- after batch 2 — the new services previously retrieved zero KB entries,
-- and generating cloud_migration_plan/app_modernization_plan/
-- sharepoint_governance_plan/data_analytics_strategy threw a clean
-- GenerationError since no prompt_templates row existed for them.
--
-- Same first-draft-content caveat as every prior KB/prompt batch
-- (docs/PRD.md §10) — not reviewed by a compliance/technical SME.

-- ---------------------------------------------------------------------
-- Knowledge Base entries — 3 per new service (12 total), same pattern as
-- the Purview KB: one general entry, one deeper-practice entry, one
-- government/regulated-environment entry, matching Bravo's federal/IC
-- client base (docs/PRD.md §11).
-- ---------------------------------------------------------------------

insert into knowledge_base_entries (title, service_type, industry, content, source_url) values

('Migration Wave Planning & Batch Sequencing', 'cloud_migration', null,
$content$Group migration batches by department or business unit rather than alphabetically or by mailbox size alone — this keeps a team's internal collaboration (shared calendars, delegate access, distribution lists) intact within the same cutover window instead of splitting it across batches. Always run a small pilot batch (IT staff and a few volunteer power users) first to surface tenant-specific issues — hybrid mail flow rules, third-party mail security gateways, unusual mailbox permission structures — before committing to the full wave schedule. Plan for a coexistence period where source and target environments both function correctly (shared address book, cross-premises free/busy, mail routing both directions) rather than assuming an instant full-tenant cutover; the length of this period should be sized to the realistic pace of batch migration, not wished shorter than the data allows.$content$,
'https://learn.microsoft.com/exchange/mailbox-migration/mailbox-migration'),

('Exchange Online Cutover & Mail Flow Coexistence', 'cloud_migration', null,
$content$During a hybrid migration, mail flow direction (inbound and outbound) must be explicitly planned per batch — a mailbox migrated to Exchange Online before its outbound mail flow is updated can end up with mail routing through the wrong path, causing delayed or misrouted messages. Stage MX record and autodiscover changes for the point where the majority of mailboxes have moved, not for day one, since flipping too early forces all mail through a coexistence path most mailboxes haven't reached yet. Validate free/busy lookups and cross-premises calendar sharing explicitly after each batch — this is one of the most common post-migration help-desk complaints and is straightforward to test proactively rather than discover from user tickets.$content$,
'https://learn.microsoft.com/exchange/hybrid-deployment/set-up-hybrid-deployment'),

('Cloud Migration for FedRAMP / GCC High Tenants', 'cloud_migration', 'Government',
$content$Third-party migration tools must themselves carry appropriate FedRAMP authorization (or equivalent) before they can touch data destined for a GCC High tenant — this is a real vendor-selection constraint, not a formality, and should be confirmed before a tool is chosen rather than after a contract is signed. GCC High tenants cannot federate or coexist directly with a commercial or GCC-only source tenant in the same way two commercial tenants can; migration approach and timeline need to account for this architectural boundary rather than assuming a like-for-like hybrid coexistence period. Data residency requirements typically mean migration staging/transit paths themselves need to stay within the authorized boundary — flag this explicitly when a customer's compliance notes reference FedRAMP, CMMC, or ITAR.$content$,
'https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government'),

('Power Platform Application Lifecycle Management (ALM)', 'app_modernization', null,
$content$Use separate development, test, and production Power Platform environments with managed solutions deployed to test/production and unmanaged solutions only in development — this is what makes safe, repeatable deployment possible instead of editing apps directly in production. Azure DevOps (or GitHub Actions) pipelines using the Power Platform Build Tools can automate export, version, and import of solutions across environments, which matters once more than a couple of apps are in play. Layer solutions logically (a core/shared components solution plus app-specific solutions referencing it) rather than one monolithic solution per environment, so a shared connector or table change doesn't require redeploying every app that uses it.$content$,
'https://learn.microsoft.com/power-platform/alm/'),

('Legacy Application Retirement Criteria', 'app_modernization', null,
$content$Not every legacy application should be modernized — some should be retired outright if the business process it supports no longer exists or has been absorbed elsewhere, and retirement is cheaper and lower-risk than rebuilding something nobody actually needs anymore. For applications that stay, decide retire/rebuild/replatform per app based on concrete criteria: usage frequency and user count, how tightly coupled it is to unsupported infrastructure, and whether the underlying business logic is still valid — not just "it's old, replace it." A low-usage, simple-logic legacy app is often a strong Power Platform low-code candidate; a high-complexity, high-usage line-of-business system usually needs a proper replatforming project, not a quick Power Apps wrapper.$content$,
'https://learn.microsoft.com/power-platform/guidance/adoption/application-modernization'),

('Power Platform Governance for Regulated Environments', 'app_modernization', 'Government',
$content$Data Loss Prevention (DLP) policies in the Power Platform admin center control which connectors can be used together within an environment (e.g., blocking a "business" connector like SharePoint from being combined with a "non-business" connector like a consumer email service in the same app) — these should be configured deliberately per environment, not left at tenant defaults, especially for environments handling CUI or other sensitive data. GCC and GCC High tenants have a smaller set of available Power Platform connectors and premium features than commercial tenants at any given time — confirm connector availability in the target tenant type before designing an app around a specific connector, rather than assuming commercial parity.$content$,
'https://learn.microsoft.com/power-platform/admin/wp-data-loss-prevention'),

('SharePoint Information Architecture & Site Structure', 'sharepoint', null,
$content$Favor a hub-and-spoke site structure (a small number of hub sites per major business function, with team/project sites associated to the relevant hub) over either a single sprawling site or an ungoverned one-site-per-request sprawl — this keeps navigation, search, and branding consistent while still letting individual teams own their own site. Default to inherited permissions at the site level and reserve unique/broken permissions for specific libraries or items that genuinely need them — unique permissions sprawl is one of the most common sources of "who can see this?" confusion and audit difficulty later. Decide and document a site-creation governance model (self-service with naming/expiration policy vs. IT-provisioned) before rollout, since retrofitting governance onto an already-sprawling site collection is far more disruptive than starting with one.$content$,
'https://learn.microsoft.com/sharepoint/information-architecture-modern-experience'),

('SharePoint Migration Methodology', 'sharepoint', null,
$content$Run a content assessment before migrating anything — inventory site count, storage volume, unsupported file types/path-length issues, and genuinely stale/orphaned content that should be left behind rather than migrated as-is. Migrate in waves by site or department the same way a mailbox migration would, with a pilot wave first to validate the migration tool's handling of the customer's actual permission models and metadata (managed metadata, content types) before committing to the full plan. Validate post-migration: permissions, version history (if migrated), and that search actually surfaces migrated content — a migration that moves files but breaks metadata or search is not actually done.$content$,
'https://learn.microsoft.com/sharepointmigration/introducing-the-sharepoint-migration-tool'),

('SharePoint Governance for CUI / Government Tenants', 'sharepoint', 'Government',
$content$Sensitivity labels can be applied directly to SharePoint sites (not just documents) to enforce site-level privacy settings, external sharing restrictions, and conditional access — this is a stronger, more auditable control for CUI-handling sites than relying on manually-configured site permissions alone. External sharing at the tenant level should default to the most restrictive setting that still meets a genuine business need, then be relaxed per-site only where justified, rather than starting permissive and trying to tighten later. GCC High SharePoint has a different (typically smaller) set of available features and third-party integrations than commercial SharePoint at any given time — confirm feature availability in the target tenant before a governance plan assumes a commercial-parity feature is available.$content$,
'https://learn.microsoft.com/purview/sensitivity-labels-sharepoint-onedrive-files'),

('Microsoft Fabric Workspace & Capacity Planning', 'analytics_ai', null,
$content$Organize Fabric workspaces by team or domain (not one giant shared workspace) so access control and item ownership stay manageable, and plan capacity (the Fabric SKU sizing that determines available compute) based on realistic concurrent workload, not just data volume — an undersized capacity throttles report refreshes and pipeline runs regardless of how well the data model is designed. OneLake, Fabric's unified storage layer, means data written by one workload (e.g., a data pipeline) is available to other Fabric workloads (e.g., Power BI) without a separate copy — factor this into architecture decisions instead of designing redundant per-workload storage the way older, siloed BI stacks required.$content$,
'https://learn.microsoft.com/fabric/enterprise/plan-capacity'),

('Copilot Readiness Assessment', 'analytics_ai', null,
$content$Microsoft 365 Copilot surfaces content to a user based on that user's *existing* permissions — it does not introduce new access, but it does make existing over-permissioned content dramatically easier to discover than it was before, since a user no longer needs to know a file exists or where to look for it. Before a Copilot rollout, run an oversharing assessment (Purview's data security posture management for AI, or at minimum a manual review of broadly-shared SharePoint sites and OneDrive folders) to find and remediate content shared more broadly than intended — this is the single most common real risk in a Copilot rollout, not a hypothetical one. Treat this as a genuine prerequisite step in the rollout plan, not an afterthought to revisit if something goes wrong post-launch.$content$,
'https://learn.microsoft.com/purview/ai-microsoft-purview'),

('Data Governance for AI / Analytics in Regulated Environments', 'analytics_ai', 'Government',
$content$Microsoft Fabric's availability in GCC/GCC High/DoD government cloud environments has historically lagged commercial availability and covers a narrower set of workloads — confirm current Fabric availability and feature parity for the specific government cloud tier in scope before designing an architecture around it, rather than assuming commercial-equivalent capability. Purview's Data Map and lineage features can track CUI as it moves through analytics pipelines, which is worth designing in explicitly for a federal customer's data governance model rather than treating classification as something that only matters at rest. Any generative AI component (Copilot, Azure OpenAI-backed features) in scope for a federal customer needs its own compliance review — data handling and training-data guarantees for government cloud AI offerings differ from commercial and should never be assumed identical.$content$,
'https://learn.microsoft.com/purview/ai-microsoft-purview');

-- ---------------------------------------------------------------------
-- Prompt templates for the 4 flagship deliverables, one per new practice
-- area — same 8-section depth as the Purview design docs (DLP Design,
-- Retention Strategy, etc.), gated via DELIVERABLE_REQUIRES_SERVICE in
-- src/lib/domain/labels.ts the same way those are.
-- ---------------------------------------------------------------------

insert into prompt_templates (deliverable_type, version, is_active, section_schema, template_body) values

('cloud_migration_plan', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "current_state_assessment", "heading": "Current State Assessment", "always": true},
  {"key": "migration_strategy", "heading": "Migration Strategy & Approach", "always": true},
  {"key": "migration_wave_plan", "heading": "Migration Wave Plan", "always": true},
  {"key": "coexistence_cutover", "heading": "Coexistence & Cutover Plan", "always": true},
  {"key": "data_validation", "heading": "Data Validation Approach", "always": true},
  {"key": "risk_contingency", "heading": "Risk & Contingency", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft cloud migration consultant drafting a Cloud Migration Plan — a focused deliverable covering the migration of a customer's environment (mail, files, identity, or infrastructure, depending on scope) to Microsoft 365 and/or Azure. More detailed than the Cloud Migration section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on migration wave-planning and cutover/coexistence guidance).

In Migration Wave Plan, propose realistic batches (by department or business unit, per the retrieved Knowledge Base guidance) rather than a single big-bang cutover, and always include a small pilot batch first. In Coexistence & Cutover Plan, be specific about mail flow direction and free/busy validation if the migration involves Exchange/mailboxes, drawing on the retrieved coexistence guidance. If compliance notes reference FedRAMP, GCC High, CMMC, or ITAR, address the retrieved government-specific migration guidance explicitly in Current State Assessment and Assumptions & Constraints (tool authorization requirements, data residency during transit, GCC High/commercial coexistence limitations) — do not assume a federal migration behaves like a commercial one.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a validated migration runbook.$body$),

('app_modernization_plan', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "current_state_assessment", "heading": "Current State Assessment (Application Inventory)", "always": true},
  {"key": "modernization_approach", "heading": "Modernization Approach by Application", "always": true},
  {"key": "power_platform_architecture", "heading": "Power Platform Architecture", "always": true},
  {"key": "devops_cicd", "heading": "DevOps & CI/CD Approach", "always": true},
  {"key": "governance_dlp", "heading": "Governance & DLP", "always": true},
  {"key": "rollout_plan", "heading": "Rollout Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft Power Platform/application modernization consultant drafting an App Modernization Plan — a focused deliverable covering the modernization of a customer's legacy applications using Power Platform and Azure DevOps. More detailed than the App Modernization section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on ALM and application-retirement-criteria guidance).

In Modernization Approach by Application, apply the retire/rebuild/replatform decision criteria from the retrieved Knowledge Base guidance rather than assuming every legacy application should simply be rebuilt — name representative example applications (as illustrative categories, not claiming knowledge of the customer's actual application portfolio) and the criteria driving each recommendation. In Power Platform Architecture, describe environment strategy (dev/test/production) and solution layering per the retrieved ALM guidance. In Governance & DLP, address Power Platform DLP policies and connector governance, drawing on the retrieved guidance — if compliance notes reference a federal/regulated tenant, address GCC/GCC High connector availability limitations explicitly rather than assuming commercial parity.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a validated architecture document.$body$),

('sharepoint_governance_plan', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "current_state_assessment", "heading": "Current State Assessment", "always": true},
  {"key": "information_architecture", "heading": "Information Architecture", "always": true},
  {"key": "governance_policies", "heading": "Governance Policies", "always": true},
  {"key": "migration_approach", "heading": "Migration Approach (if applicable)", "always": true},
  {"key": "compliance_integration", "heading": "Compliance Integration", "always": true},
  {"key": "rollout_plan", "heading": "Rollout Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft SharePoint consultant drafting a SharePoint Governance Plan — a focused deliverable covering information architecture, governance policy, and (where relevant) migration for the customer's SharePoint environment. More detailed than the SharePoint section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on information-architecture and governance guidance).

In Information Architecture, propose a hub-and-spoke site structure per the retrieved Knowledge Base guidance rather than either a single monolithic site or ungoverned sprawl. In Governance Policies, address permissions model (inherited vs. unique), external sharing defaults, and site-creation governance explicitly, drawing on the retrieved guidance. In Compliance Integration, address how sensitivity labels and retention apply to SharePoint sites specifically (not just individual documents) if Data Security & Compliance services are also in scope for this project; if compliance notes reference CUI, FedRAMP, or GCC High, address the retrieved government-specific SharePoint governance guidance explicitly (site-level sensitivity labels, feature-availability limitations) rather than assuming commercial-parity SharePoint. Migration Approach should be addressed if the compliance notes or Current State Assessment imply content is moving from another platform or from on-premises SharePoint; otherwise note explicitly that migration is out of scope for this plan.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a validated governance policy document.$body$),

('data_analytics_strategy', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "current_state_assessment", "heading": "Current State Assessment", "always": true},
  {"key": "data_platform_architecture", "heading": "Data Platform Architecture", "always": true},
  {"key": "data_governance_model", "heading": "Data Governance Model", "always": true},
  {"key": "copilot_readiness", "heading": "Copilot Readiness", "always": true},
  {"key": "analytics_use_cases", "heading": "Analytics Use Cases", "always": true},
  {"key": "rollout_plan", "heading": "Rollout Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft data & AI consultant drafting a Data & Analytics Strategy — a focused deliverable covering the customer's data platform architecture (Microsoft Fabric), data governance, and generative-AI (Copilot) readiness. More detailed than the Analytics, Data & AI section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on Fabric capacity-planning, Copilot-readiness, and data-governance guidance).

In Data Platform Architecture, address Fabric workspace organization and capacity sizing per the retrieved Knowledge Base guidance, and reference OneLake's unified-storage model rather than proposing redundant per-workload storage. In Copilot Readiness, treat the oversharing risk described in the retrieved Knowledge Base guidance as a genuine prerequisite finding, not an afterthought — recommend an oversharing assessment before rollout if Copilot is in scope or implied by the engagement. In Data Governance Model, address Purview Data Map/lineage if Data Security & Compliance services are also in scope for this project. If compliance notes reference FedRAMP, GCC High, or CUI, address the retrieved government-specific Fabric-availability and AI-compliance guidance explicitly in Current State Assessment and Assumptions & Constraints — do not assume commercial-parity Fabric/Copilot availability for a federal customer.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a validated data strategy document.$body$);
