-- Engagement Assistant (Module 8, batch 2) — prompt templates for the 3
-- deliverable types added in 0040. Same 6-section, "core" depth as
-- Executive Summary/SOW (docs/TDD.md §7 — this catalog gap is the
-- Engagement Assistant work Module 8 was missing, not project-scoped
-- design docs like HLD/DLP Design), same "2-4 short paragraphs" pacing
-- instruction, same AI-disclaimer footer convention.
--
-- Discovery Questionnaire and Risk Register both gate a per-service
-- section on DELIVERABLE_REQUIRES_SERVICE... no — neither is in that map
-- (see src/lib/domain/labels.ts), so every section below is either
-- always-present or gated per individual service via section_schema's
-- own requires_service, the same pattern High-Level Design uses for its
-- 12 per-service design sections (getApplicableSections in prompt.ts
-- filters these automatically, no app code needed for a new gated
-- section — just data in this migration).

insert into prompt_templates (deliverable_type, version, is_active, section_schema, template_body) values

('discovery_questionnaire', 1, true,
$json$[
  {"key": "purpose", "heading": "Purpose & How to Use This Questionnaire", "always": true},
  {"key": "environment_licensing", "heading": "Organization & Environment Overview", "always": true},
  {"key": "compliance_landscape", "heading": "Compliance & Regulatory Landscape", "always": true},
  {"key": "stakeholders", "heading": "Stakeholders & Decision Makers", "always": true},
  {"key": "q_dlp", "heading": "Data Loss Prevention Questions", "requires_service": "dlp"},
  {"key": "q_retention", "heading": "Retention & Records Management Questions", "requires_service": "retention"},
  {"key": "q_sensitivity_labels", "heading": "Sensitivity Labels Questions", "requires_service": "sensitivity_labels"},
  {"key": "q_dlm", "heading": "Data Lifecycle Management Questions", "requires_service": "data_lifecycle_management"},
  {"key": "q_insider_risk", "heading": "Insider Risk Management Questions", "requires_service": "insider_risk_management"},
  {"key": "q_ediscovery", "heading": "eDiscovery Questions", "requires_service": "ediscovery"},
  {"key": "q_information_protection", "heading": "Information Protection Questions", "requires_service": "information_protection"},
  {"key": "q_communication_compliance", "heading": "Communication Compliance Questions", "requires_service": "communication_compliance"},
  {"key": "q_cloud_migration", "heading": "Cloud Migration Questions", "requires_service": "cloud_migration"},
  {"key": "q_app_modernization", "heading": "App Modernization Questions", "requires_service": "app_modernization"},
  {"key": "q_sharepoint", "heading": "SharePoint Questions", "requires_service": "sharepoint"},
  {"key": "q_analytics_ai", "heading": "Analytics & AI Questions", "requires_service": "analytics_ai"},
  {"key": "timeline_success", "heading": "Timeline & Success Criteria", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft technology consultant preparing a Discovery Questionnaire for an early engagement call — a structured set of questions the consulting team asks the customer to properly scope the work, not a deliverable handed to the customer as a finished document.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries.

Write every section except "Purpose & How to Use This Questionnaire" as a list of specific, concrete questions (3-8 per section) a consultant would actually ask — not generic prompts like "tell us about your environment." Ground each per-service question section in the retrieved Knowledge Base guidance for that service where relevant (e.g., migration wave-planning questions for Cloud Migration, oversharing/Copilot-readiness questions for Analytics & AI). "Purpose & How to Use This Questionnaire" is the one section written as short prose (1-2 paragraphs) explaining the questionnaire's role in scoping the engagement. If compliance notes reference a specific regulatory framework (HIPAA, FedRAMP, NIST 800-53, CMMC, GDPR), include at least one question in Compliance & Regulatory Landscape that names it explicitly rather than asking generically about "compliance requirements."

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order — each paragraph in a question section is one question.

This is an AI-generated draft requiring consultant review before use on a real discovery call — it is not a substitute for the consultant's own judgment about what to ask.$body$),

('risk_register', 1, true,
$json$[
  {"key": "methodology", "heading": "Overview & Methodology", "always": true},
  {"key": "technical_risks", "heading": "Technical & Architecture Risks", "always": true},
  {"key": "timeline_risks", "heading": "Timeline & Resourcing Risks", "always": true},
  {"key": "adoption_risks", "heading": "Organizational Change & Adoption Risks", "always": true},
  {"key": "compliance_risks", "heading": "Compliance & Regulatory Risks", "always": true},
  {"key": "r_dlp", "heading": "DLP Implementation Risks", "requires_service": "dlp"},
  {"key": "r_retention", "heading": "Retention & Records Management Risks", "requires_service": "retention"},
  {"key": "r_sensitivity_labels", "heading": "Sensitivity Labels Rollout Risks", "requires_service": "sensitivity_labels"},
  {"key": "r_dlm", "heading": "Data Lifecycle Management Risks", "requires_service": "data_lifecycle_management"},
  {"key": "r_insider_risk", "heading": "Insider Risk Program Risks", "requires_service": "insider_risk_management"},
  {"key": "r_ediscovery", "heading": "eDiscovery Risks", "requires_service": "ediscovery"},
  {"key": "r_information_protection", "heading": "Information Protection Risks", "requires_service": "information_protection"},
  {"key": "r_communication_compliance", "heading": "Communication Compliance Risks", "requires_service": "communication_compliance"},
  {"key": "r_cloud_migration", "heading": "Cloud Migration Risks", "requires_service": "cloud_migration"},
  {"key": "r_app_modernization", "heading": "App Modernization Risks", "requires_service": "app_modernization"},
  {"key": "r_sharepoint", "heading": "SharePoint Migration & Governance Risks", "requires_service": "sharepoint"},
  {"key": "r_analytics_ai", "heading": "Analytics & AI Adoption Risks", "requires_service": "analytics_ai"},
  {"key": "risk_summary", "heading": "Risk Summary & Prioritization", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft technology consultant drafting a Risk Register for a client engagement — a structured log of engagement risks (not security findings) with likelihood, impact, and mitigation, used to track and communicate risk throughout delivery.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries.

In "Overview & Methodology", briefly state how likelihood and impact are being assessed (a simple low/medium/high scale) so the register is internally consistent. Every other section except "Risk Summary & Prioritization" should list 2-5 distinct risks, each written as: a one-sentence risk statement, its likelihood, its impact, and a concrete mitigation — not vague statements like "there could be technical issues." Ground each per-service risk section in the retrieved Knowledge Base guidance for that service where relevant (e.g., coexistence/cutover risks for Cloud Migration, DLP policy/connector governance risks for App Modernization). "Risk Summary & Prioritization" should name the 3-5 highest-priority risks across every section above, in priority order, with a one-line reason each. If compliance notes reference a specific regulatory framework, address it explicitly as its own risk in Compliance & Regulatory Risks rather than only in general terms.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order — each paragraph in a risk section is one risk (statement + likelihood + impact + mitigation, as one paragraph).

This is an AI-generated draft requiring consultant review before use — it does not replace the consulting team's own risk assessment judgment.$body$),

('client_presentation', 1, true,
$json$[
  {"key": "overview", "heading": "Engagement Overview", "always": true},
  {"key": "objectives", "heading": "Objectives & Success Criteria", "always": true},
  {"key": "scope_summary", "heading": "Scope Summary", "always": true},
  {"key": "approach_timeline", "heading": "Approach & Timeline", "always": true},
  {"key": "key_risks", "heading": "Key Risks & Mitigations", "always": true},
  {"key": "next_steps", "heading": "Next Steps", "always": true}
]$json$::jsonb,
$body$You are a senior Microsoft technology consultant drafting the content for a Client Presentation — a short, client-facing deck (not a detailed document) presented to the customer's stakeholders, most often exported to PowerPoint. Your audience is a mix of technical and executive stakeholders in a live meeting, not a reader working through a document alone.

Inputs available to you: customer name, industry, user count, licensing tier, geographic locations, compliance notes, the list of services in scope, and relevant Knowledge Base reference entries.

Write every section as short, punchy bullet points meant to be read on a slide and expanded on verbally — 2-5 short paragraphs per section, each paragraph one bullet of at most 1-2 sentences, never a dense paragraph of prose. Ground "Scope Summary" and "Approach & Timeline" in the actual services selected, the same way Executive Summary does, so a Cloud-Migration-only engagement reads like a migration engagement, not a security-and-compliance one. "Key Risks & Mitigations" should surface only the 2-4 risks a client audience actually needs to hear about, each as one bullet naming the risk and its mitigation in a single sentence — not an exhaustive register. Do not invent specific dollar figures, dates, or named personnel — leave those as placeholders the consultant fills in.

Output must be valid JSON matching the section schema: an array of {"heading": string, "paragraphs": string[]} objects, one per section listed above, in order.

This is an AI-generated draft. Do not present any statement as certified legal or compliance advice — frame recommendations as what the engagement will help the customer achieve, not as guarantees of compliance status.$body$);
