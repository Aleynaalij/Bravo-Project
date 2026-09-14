-- Sprint 2: prompt templates + supporting Knowledge Base entries for the
-- 3 new deliverable types added in 0007. Same first-draft-content caveat
-- as Epic C (docs/PRD.md §10) — not reviewed by a compliance SME.

-- ---------------------------------------------------------------------
-- Supporting Knowledge Base entries (deepen coverage for the new docs'
-- most detail-heavy sections)
-- ---------------------------------------------------------------------

insert into knowledge_base_entries (title, service_type, industry, content, source_url) values

('DLP Policy Simulation & Tuning Methodology', 'dlp', null,
$content$Run every new DLP policy in simulation mode (Policy Tips off, no enforcement) for at least 2-4 weeks before enabling any block action — this is where false-positive rates actually get measured against real traffic, not guessed at. Review simulation results weekly with the policy owner; a rule generating more than a handful of false positives per day needs tuning (narrower match conditions, higher confidence thresholds on the sensitive info type) before it graduates to enforcement. Move to "Test with notifications" before full "Block" — this gives end users a chance to self-correct and surfaces edge cases the simulation data didn't catch. Document the graduation criteria (e.g., "under 5% false-positive rate for 2 consecutive weeks") in the design so the customer has an objective bar, not a subjective one.$content$,
'https://learn.microsoft.com/purview/dlp-policy-reference'),

('Legal Hold and Retention Policy Interaction', 'retention', null,
$content$A legal/eDiscovery hold always wins over a retention or lifecycle deletion policy — content under hold is preserved regardless of what a retention label or policy says, but this needs to be explicitly documented in the design so the customer's legal team understands the interaction rather than assuming retention policies alone are sufficient during litigation. When a hold is released, previously-blocked disposition resumes automatically — flag this so nobody is surprised by a wave of deletions after a hold is lifted. Retention labels marking content as a "Record" add an extra layer: a labeled record generally cannot be deleted or edited even by an admin without going through the defined disposition/declassification process, which is a deliberate design choice worth calling out as a feature, not a limitation, in customer-facing documentation.$content$,
'https://learn.microsoft.com/purview/holds-learn-about'),

('Sensitivity Label Analytics & Adoption Tracking', 'sensitivity_labels', null,
$content$Label analytics (Content explorer, Activity explorer in Purview) show which labels are actually being applied and where — use this data after the pilot phase to identify business units with low adoption before mandating labeling org-wide, rather than mandating first and discovering adoption gaps later. Track "unlabeled sensitive content" specifically (content matching a sensitive information type with no label applied) as the key adoption metric, not just "how many labels were applied" — a high label count with most of it applied to low-sensitivity content isn't actually adoption success. Plan a recurring (monthly or quarterly) adoption review as part of the rollout, not a one-time launch checklist item.$content$,
'https://learn.microsoft.com/purview/data-classification-activity-explorer');

-- ---------------------------------------------------------------------
-- Prompt templates (version 1, active)
-- ---------------------------------------------------------------------

insert into prompt_templates (deliverable_type, version, is_active, section_schema, template_body) values

('dlp_design', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "current_state_assessment", "heading": "Current State Assessment", "always": true},
  {"key": "policy_design_by_location", "heading": "DLP Policy Design by Location", "always": true},
  {"key": "sensitive_info_types", "heading": "Sensitive Information Types & Classifiers", "always": true},
  {"key": "enforcement_tiers", "heading": "Enforcement Tiers & Rollout Approach", "always": true},
  {"key": "incident_response", "heading": "Incident Response Workflow", "always": true},
  {"key": "testing_validation", "heading": "Testing & Validation Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 security consultant drafting a DLP (Data Loss Prevention) Design document — a focused technical design for the DLP workstream specifically, more detailed than the DLP section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on DLP-tagged entries for policy design and simulation/tuning methodology).

In DLP Policy Design by Location, cover each relevant location (Exchange, SharePoint/OneDrive, Teams chat/channel messages, endpoint devices) explicitly — do not write a single generic policy description that ignores location differences. In Enforcement Tiers & Rollout Approach, describe the simulation → test-with-notifications → block progression concretely, including how graduation between tiers is decided (reference the retrieved Knowledge Base guidance on simulation/tuning if present). If compliance notes reference FedRAMP, NIST 800-53, or CMMC, address the relevant control mapping (e.g., SC-7, SC-8, MP.L2-3.8.1) explicitly in Current State Assessment or Assumptions & Constraints rather than treating this as a generic commercial engagement.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a certified compliance assessment.$body$),

('retention_strategy', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "regulatory_business_drivers", "heading": "Regulatory & Business Drivers", "always": true},
  {"key": "retention_label_taxonomy", "heading": "Retention Label Taxonomy", "always": true},
  {"key": "retention_policy_scope", "heading": "Retention Policy Scope & Locations", "always": true},
  {"key": "disposition_review_process", "heading": "Disposition Review Process", "always": true},
  {"key": "legal_hold_interaction", "heading": "Legal Hold Interaction", "always": true},
  {"key": "rollout_plan", "heading": "Rollout Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 compliance consultant drafting a Retention Strategy document — a focused deliverable covering retention labels, policies, and records management, more detailed than the retention section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on retention-tagged entries, including the legal hold interaction guidance).

In Retention Label Taxonomy, propose a small, defensible set of labels mapped to the customer's likely record categories — do not invent an exhaustive taxonomy with no grounding in the customer's industry. Legal Hold Interaction must explicitly explain that holds override retention/disposition, drawing on the retrieved Knowledge Base entry on this if present — this is a common point of confusion worth getting right. If compliance notes reference a federal customer (FedRAMP, NIST 800-53, NARA), align Regulatory & Business Drivers and the label taxonomy with federal records schedules rather than generic commercial retention periods, and flag that the actual agency-specific schedule is an input the consultant must supply, not something to assume.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant review before delivery — it is not certified legal or records-management advice.$body$),

('sensitivity_labeling_plan', 1, true,
$json$[
  {"key": "overview", "heading": "Overview", "always": true},
  {"key": "label_taxonomy", "heading": "Label Taxonomy & Classification Levels", "always": true},
  {"key": "protection_actions", "heading": "Protection Actions per Label", "always": true},
  {"key": "auto_labeling", "heading": "Auto-Labeling & Trainable Classifiers", "always": true},
  {"key": "default_mandatory_labeling", "heading": "Default & Mandatory Labeling Policy", "always": true},
  {"key": "training_change_management", "heading": "User Training & Change Management", "always": true},
  {"key": "rollout_plan", "heading": "Rollout Plan", "always": true},
  {"key": "assumptions_constraints", "heading": "Assumptions & Constraints", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft 365 information protection consultant drafting a Sensitivity Labeling Plan — a focused deliverable covering label taxonomy, protection actions, and rollout, more detailed than the sensitivity labels section of a general High-Level Design.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries (draw especially on sensitivity-labels-tagged entries, including label analytics/adoption tracking).

In Label Taxonomy & Classification Levels, propose 4-6 top-level labels appropriate to the customer's industry — do not propose more without a clear justification. Protection Actions per Label must map each label to a concrete action (encryption, watermarking, access restriction, or none for low-sensitivity labels) — a label with no described action is incomplete. User Training & Change Management should reference adoption tracking as an ongoing practice, not a one-time launch step, drawing on the retrieved Knowledge Base guidance if present. If compliance notes reference CUI, CMMC, or NIST 800-171, align the taxonomy with CUI categories and dissemination controls rather than generic commercial classification tiers, per the retrieved government-specific Knowledge Base entries.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft requiring consultant technical review before delivery — it is not a certified compliance assessment.$body$);
