-- Sprint 1 Epic C: Knowledge Base seed content + prompt templates for the
-- MVP's 3 deliverable types (Executive Summary, Statement of Work,
-- High-Level Design). See docs/sprint-1-plan.md Epic C and docs/PRD.md §11
-- for why federal/defense frameworks (FedRAMP, NIST 800-53, CMMC, FISMA)
-- are represented alongside commercial ones — the design-partner reference
-- customer (Bravo Consulting Group) is federal/IC-heavy.
--
-- This is first-draft domain content, not reviewed by a compliance SME —
-- see docs/PRD.md §10 open question on regulatory review process.

-- ---------------------------------------------------------------------
-- Knowledge base entries
-- ---------------------------------------------------------------------

insert into knowledge_base_entries (title, service_type, industry, content, source_url) values

('Microsoft Purview DLP Baseline Policies', 'dlp', null,
$content$Start with Microsoft's built-in sensitive information types (SITs) — credit card numbers, SSNs, financial account numbers — before authoring custom SITs or trainable classifiers. Deploy in test/simulation mode first to tune false-positive rates against real traffic before enforcing block actions. Scope initial policies to the highest-risk locations (Exchange, SharePoint/OneDrive, Teams chat) rather than all workloads at once. Pair every DLP policy with a defined incident response workflow — a policy with no owner reviewing alerts is a compliance liability, not a control.$content$,
'https://learn.microsoft.com/purview/dlp-learn-about-dlp'),

('DLP for FedRAMP / CMMC Environments', 'dlp', 'Government',
$content$In GCC High / DoD environments, DLP policies must account for Controlled Unclassified Information (CUI) markings and CMMC 2.0 Level 2 practice MP.L2-3.8.1 (media protection) alongside standard DLP scope. Align DLP endpoint and network exfiltration controls with NIST 800-53 control family SC (System and Communications Protection), specifically SC-7 (boundary protection) and SC-8 (transmission confidentiality). Document DLP policy coverage explicitly in the customer's System Security Plan (SSP) — auditors will ask for policy-to-control traceability, not just that DLP exists.$content$,
'https://learn.microsoft.com/microsoft-365/compliance/offering-fedramp'),

('Retention Label & Records Management Fundamentals', 'retention', null,
$content$Distinguish retention labels (content-level, can be user-applied or auto-applied) from retention policies (location-level, apply broadly without per-item classification). Use auto-apply labels driven by sensitive information types or trainable classifiers to avoid relying on end users to self-classify. Define a disposition review workflow before enabling label-driven deletion — records management programs fail most often at the "who approves deletion" step, not the labeling step. Map label names to the customer's existing records retention schedule rather than inventing new categories.$content$,
'https://learn.microsoft.com/purview/retention'),

('Federal Records Retention Alignment (NARA / NIST 800-53 AU-11)', 'retention', 'Government',
$content$Federal records management programs must align retention schedules with NARA-approved General Records Schedules (GRS) or agency-specific schedules, not generic commercial retention periods. NIST 800-53 AU-11 (Audit Record Retention) sets minimum audit log retention independent of business records retention — treat these as two separate label sets. For CUI, retention and disposition must also satisfy 32 CFR Part 2002 handling requirements. Flag any customer-specific agency records schedule as an input the consultant must supply; the AI Generation Engine should not assume a default federal retention period.$content$,
'https://www.archives.gov/records-mgmt/grs'),

('Sensitivity Label Taxonomy Design', 'sensitivity_labels', null,
$content$Keep the initial label taxonomy small — 4 to 6 top-level labels (e.g., Public, Internal, Confidential, Highly Confidential) with sub-labels only where a distinct protection action (encryption, watermarking, access restriction) is actually needed. Map each label to a concrete protection action, not just a name; a label with no enforced action trains users to ignore labeling. Enable default labeling on Office apps for the two most common labels before rolling out mandatory labeling org-wide. Pilot with one business unit before tenant-wide enforcement.$content$,
'https://learn.microsoft.com/purview/sensitivity-labels'),

('CUI Labeling per NIST 800-171 / CMMC', 'sensitivity_labels', 'Government',
$content$For contractors handling Controlled Unclassified Information, sensitivity labels should map directly to CUI categories and dissemination controls (e.g., CUI//SP-PRIV, CUI//NOFORN) rather than generic commercial classification tiers. CMMC 2.0 Level 2 requires documented marking and handling procedures for CUI (aligned to NIST 800-171 control 3.8.4); the sensitivity label taxonomy is the primary technical control satisfying this in an M365 environment. Encryption enforcement on CUI-labeled content should map to NIST 800-171 3.13.11 (FIPS-validated cryptography) — confirm the tenant's encryption configuration actually uses FIPS 140-2/140-3 validated modules before representing this control as satisfied.$content$,
'https://dodcio.defense.gov/CMMC/'),

('Data Lifecycle Management Baseline', 'data_lifecycle_management', null,
$content$Data lifecycle management in Purview spans import, classification, retention/deletion, and (for some tenants) archival to lower-cost storage. Start by inventorying data sources and owners before designing lifecycle policies — a lifecycle policy applied without a data map tends to either over-retain (cost/risk) or under-retain (compliance gap). Coordinate lifecycle policies with the retention and sensitivity-label workstreams explicitly; these three services frequently conflict if designed in isolation (e.g., a lifecycle deletion policy racing a legal hold).$content$,
'https://learn.microsoft.com/purview/data-lifecycle-management'),

('Insider Risk Management Policy Templates', 'insider_risk_management', null,
$content$Start from Microsoft's built-in policy templates (data theft by departing employees, data leaks, security policy violations) rather than authoring detection logic from scratch. Insider Risk Management requires HR data connector integration (resignation/termination dates) to be effective for departing-employee scenarios — flag this as a dependency during scoping, not an implementation detail. Establish a cross-functional review committee (HR, Legal, Security) before enabling case escalation; this is a governance/process deliverable as much as a technical one.$content$,
'https://learn.microsoft.com/purview/insider-risk-management'),

('Insider Threat Program Alignment (NISPOM / E.O. 13587)', 'insider_risk_management', 'Government',
$content$Federal contractors under NISPOM (32 CFR Part 117) and cleared facilities under E.O. 13587 typically already operate an Insider Threat Program with a designated Senior Official. Microsoft Purview Insider Risk Management should be positioned as a technical data source feeding that existing program, not a replacement for it — avoid recommending a parallel governance structure. Case data handling and retention within Insider Risk Management must itself comply with the facility's classified/CUI handling procedures if analyst review touches classified indicators.$content$,
'https://www.dcsa.mil/Contractor-Resources/'),

('eDiscovery (Standard vs Premium) Scoping', 'ediscovery', null,
$content$Scope early whether the engagement needs eDiscovery (Standard) — search, hold, export — or (Premium) — custodian management, review sets, analytics, and Advanced eDiscovery. Premium requires E5 or an eDiscovery add-on; confirm licensing before committing to a Premium-scope deliverable. Legal hold configuration should be reviewed with the customer's legal/compliance team, not designed unilaterally by IT — hold scope decisions carry legal risk beyond the technical implementation.$content$,
'https://learn.microsoft.com/purview/ediscovery'),

('Information Protection Baseline (MIP)', 'information_protection', null,
$content$Information protection in Purview centers on sensitivity labels plus encryption, but also includes Double Key Encryption (DKE) and Hold Your Own Key (HYOK) for customers with regulatory requirements to retain sole key control. Most commercial customers do not need DKE/HYOK — recommend standard Microsoft-managed encryption unless a specific regulatory driver requires otherwise, since DKE materially increases operational complexity (the customer must run and secure their own key service).$content$,
'https://learn.microsoft.com/purview/information-protection'),

('FedRAMP High / DoD IL4-5 Information Protection Considerations', 'information_protection', 'Government',
$content$Customers targeting FedRAMP High or DoD Impact Level 4/5 workloads generally require GCC High or DoD tenants, not commercial or GCC. Confirm tenant type before scoping information protection work — recommendations valid for commercial M365 (e.g., certain third-party key management integrations) may not be available or authorized in GCC High. Double Key Encryption is more commonly a real requirement here than in commercial engagements; treat it as a scoping question rather than assuming it in or out.$content$,
'https://learn.microsoft.com/microsoft-365/compliance/offering-fedramp'),

('Communication Compliance Policy Baseline', 'communication_compliance', null,
$content$Communication Compliance policies (offensive language, sensitive information sharing, regulatory-specific templates like conflict of interest) require careful scoping of reviewer groups and user privacy settings before enablement — this is a workplace-monitoring capability and typically needs HR/Legal sign-off, not just IT approval. Start with a narrow pilot group and a single policy template before expanding scope. Configure reviewer permissions with least privilege; reviewers should only see flagged content, not full mailbox/chat access.$content$,
'https://learn.microsoft.com/purview/communication-compliance');

-- ---------------------------------------------------------------------
-- Prompt templates (version 1, active)
-- ---------------------------------------------------------------------

insert into prompt_templates (deliverable_type, version, is_active, section_schema, template_body) values

('executive_summary', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "business_drivers", "heading": "Business Drivers & Objectives", "always": true},
  {"key": "scope_summary", "heading": "Scope Summary", "always": true},
  {"key": "key_recommendations", "heading": "Key Recommendations", "always": true},
  {"key": "expected_outcomes", "heading": "Expected Outcomes", "always": true},
  {"key": "next_steps", "heading": "Next Steps", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 security and compliance consultant drafting an Executive Summary for a client engagement. Your audience is the customer's executive sponsor — write for a non-technical reader who needs to understand why this engagement matters and what they're getting, not implementation detail.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes (free text — may reference specific regulatory frameworks such as HIPAA, FedRAMP, NIST 800-53, CMMC, GDPR), the list of services in scope (from: DLP, Retention/Records Management, Sensitivity Labels, Data Lifecycle Management, Insider Risk Management, eDiscovery, Information Protection, Communication Compliance), and relevant Knowledge Base reference entries retrieved for the selected services and industry.

Write each section as 2-4 short paragraphs or a tight bulleted list — this document should be readable in under 5 minutes. If the compliance notes reference a specific regulatory framework, name it explicitly in Business Drivers & Objectives rather than speaking generically about "compliance." Do not invent specific dollar figures, dates, or named personnel — leave those as placeholders the consultant fills in.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft. Do not present any statement as certified legal or compliance advice — frame recommendations as what the engagement will help the customer achieve, not as guarantees of compliance status.$body$),

('statement_of_work', 1, true,
$json$[
  {"key": "project_overview", "heading": "Project Overview", "always": true},
  {"key": "objectives", "heading": "Objectives", "always": true},
  {"key": "scope_of_work", "heading": "Scope of Work", "always": true},
  {"key": "deliverables", "heading": "Deliverables", "always": true},
  {"key": "roles_responsibilities", "heading": "Roles & Responsibilities", "always": true},
  {"key": "timeline_milestones", "heading": "Timeline & Milestones", "always": true},
  {"key": "assumptions_exclusions", "heading": "Assumptions & Exclusions", "always": true},
  {"key": "acceptance_criteria", "heading": "Acceptance Criteria", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 security and compliance consultant drafting a Statement of Work (SOW). This is a semi-formal contractual document defining what work will be performed — write precisely and avoid vague language ("various improvements"); every scope item should be specific enough that a reader could tell later whether it was delivered.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries.

In Scope of Work, itemize the technical work per service actually in scope — for each selected service, describe what will be assessed, designed, configured, and validated (e.g., for DLP: "Assess current data exfiltration risk, design DLP policies for [locations], deploy in simulation mode, tune based on results, enable enforcement"). Do not describe work for services not in scope. If compliance notes reference a specific regulatory framework (FedRAMP, NIST 800-53, CMMC, HIPAA, GDPR, etc.), reference it explicitly in Objectives and note any framework-specific deliverables (e.g., control mapping, SSP updates) in Deliverables. In Assumptions & Exclusions, explicitly exclude services not selected, out-of-scope licensing tiers, and any tenant type assumptions (e.g., commercial vs. GCC High) implied by the compliance notes. Leave pricing, specific dates, and named staff as placeholders.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant and (for regulated customers) legal review before it is sent to a client — it is not a binding contract as generated.$body$),

('high_level_design', 1, true,
$json$[
  {"key": "current_state_summary", "heading": "Current State Summary", "always": true},
  {"key": "proposed_architecture_overview", "heading": "Proposed Architecture Overview", "always": true},
  {"key": "design_dlp", "heading": "Data Loss Prevention (DLP) Design", "requires_service": "dlp"},
  {"key": "design_retention", "heading": "Retention & Records Management Design", "requires_service": "retention"},
  {"key": "design_sensitivity_labels", "heading": "Sensitivity Labels Design", "requires_service": "sensitivity_labels"},
  {"key": "design_dlm", "heading": "Data Lifecycle Management Design", "requires_service": "data_lifecycle_management"},
  {"key": "design_insider_risk", "heading": "Insider Risk Management Design", "requires_service": "insider_risk_management"},
  {"key": "design_ediscovery", "heading": "eDiscovery Design", "requires_service": "ediscovery"},
  {"key": "design_information_protection", "heading": "Information Protection Design", "requires_service": "information_protection"},
  {"key": "design_communication_compliance", "heading": "Communication Compliance Design", "requires_service": "communication_compliance"},
  {"key": "integration_points", "heading": "Integration Points", "always": true},
  {"key": "security_compliance_considerations", "heading": "Security & Compliance Considerations", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true},
  {"key": "recommendations_next_steps", "heading": "Recommendations & Next Steps", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 security and compliance architect drafting a High-Level Design (HLD). This is the technical design document — be specific about configuration approach, not just goals. Reference actual Purview capabilities and features by name.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries retrieved for the selected services and industry.

Generate a design section ONLY for services actually in scope — the section_schema marks each service-specific section with "requires_service"; skip any section whose required service was not selected. Order design sections to match the order services appear in the input, not the schema's default order. For each service's design section, cover: current-state assumptions, proposed policy/configuration approach (drawing on the retrieved Knowledge Base entries), and validation approach. If compliance notes reference FedRAMP, NIST 800-53, CMMC, or FISMA, explicitly note tenant-type implications (e.g., GCC High vs. commercial) in Current State Summary and address the specific control families or practices the retrieved government-specific Knowledge Base entries reference in Security & Compliance Considerations — do not silently treat a federal customer like a commercial one. In Assumptions & Constraints, state the licensing tier's limitations explicitly (e.g., Premium eDiscovery requires E5) rather than assuming capabilities the customer's tier may not include.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, in the order described above, omitting any service-specific section whose service was not selected.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a certified compliance assessment.$body$);
