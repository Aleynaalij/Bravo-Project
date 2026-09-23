import type { DeliverableType, ProjectStatus, ServiceType } from "./enums";

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  executive_summary: "Executive Summary",
  statement_of_work: "Statement of Work",
  high_level_design: "High-Level Design",
  dlp_design: "DLP Design",
  retention_strategy: "Retention Strategy",
  sensitivity_labeling_plan: "Sensitivity Labeling Plan",
  low_level_design: "Low-Level Design",
  testing_guide: "Testing Guide",
  uat_plan: "UAT Plan",
  rollback_procedures: "Rollback Procedures",
  runbooks: "Operational Runbooks",
  cab_request: "CAB Request",
  change_management: "Change Management Plan",
  compliance_report: "Compliance Report",
  cloud_migration_plan: "Cloud Migration Plan",
  app_modernization_plan: "App Modernization Plan",
  sharepoint_governance_plan: "SharePoint Governance Plan",
  data_analytics_strategy: "Data & Analytics Strategy",
  implementation_script: "Implementation Script",
  discovery_questionnaire: "Discovery Questionnaire",
  risk_register: "Risk Register",
  client_presentation: "Client Presentation",
};

// Deliverable types that only make sense when a specific service is in
// scope (unlike Executive Summary/SOW/HLD, which apply regardless).
// Generation offers these only when the mapped service is selected —
// generating e.g. a DLP Design for a project with no DLP in scope would
// have nothing real to draw on.
// implementation_script is deliberately absent here even though it's only
// really useful with DLP, retention, or sensitivity labels in scope —
// this map only expresses a single required service, and that script
// deliverable's sections are individually gated to each of those three
// (see supabase/migrations for its prompt_templates section_schema), so
// leaving it ungated (like Executive Summary/SOW/HLD) is correct: with
// none of the three in scope it still generates, just with only its
// always-present prerequisites/connection section.
export const DELIVERABLE_REQUIRES_SERVICE: Partial<Record<DeliverableType, ServiceType>> = {
  dlp_design: "dlp",
  retention_strategy: "retention",
  sensitivity_labeling_plan: "sensitivity_labels",
  cloud_migration_plan: "cloud_migration",
  app_modernization_plan: "app_modernization",
  sharepoint_governance_plan: "sharepoint",
  data_analytics_strategy: "analytics_ai",
};

export const DELIVERABLE_CATEGORIES = ["core", "design", "process", "compliance", "automation"] as const;
export type DeliverableCategory = (typeof DELIVERABLE_CATEGORIES)[number];

export const DELIVERABLE_CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  core: "Core",
  design: "Design",
  process: "Testing & Change",
  compliance: "Compliance",
  automation: "Automation",
};

// Groups the catalog for the generate form's module-card layout — purely
// presentational, doesn't affect what gets generated or how. The 4 new
// practice-area flagship deliverables slot into "design" alongside DLP
// Design/LLD — same role (a deep per-service planning/design artifact),
// just for a different practice area.
export const DELIVERABLE_CATEGORY: Record<DeliverableType, DeliverableCategory> = {
  executive_summary: "core",
  statement_of_work: "core",
  high_level_design: "core",
  dlp_design: "design",
  retention_strategy: "design",
  sensitivity_labeling_plan: "design",
  low_level_design: "design",
  testing_guide: "process",
  uat_plan: "process",
  rollback_procedures: "process",
  runbooks: "process",
  cab_request: "process",
  change_management: "process",
  compliance_report: "compliance",
  cloud_migration_plan: "design",
  app_modernization_plan: "design",
  sharepoint_governance_plan: "design",
  data_analytics_strategy: "design",
  implementation_script: "automation",
  discovery_questionnaire: "core",
  risk_register: "process",
  client_presentation: "core",
};

// Deliverable types whose paragraphs are actual runnable script content
// (PowerShell/Microsoft Graph), not prose — rendered and exported in a
// monospace code block instead of normal body text. See
// src/lib/generation/prompt.ts's per-type instruction branch for how the
// model is told to produce plain script text (no markdown fences) so
// what's stored is exactly what a consultant would paste into a terminal.
export const CODE_DELIVERABLE_TYPES: ReadonlySet<DeliverableType> = new Set(["implementation_script"]);

export function isCodeDeliverable(type: DeliverableType): boolean {
  return CODE_DELIVERABLE_TYPES.has(type);
}

// Deliverable types the generation prompt asks to also produce a
// structured architecture diagram (src/lib/validation/deliverable.ts's
// `diagram` field) alongside its normal sections — see
// src/lib/generation/prompt.ts and the export builders' diagram
// rendering. Starting with just High-Level Design (the one deliverable
// that's literally an architecture design) rather than every "design"-
// category type — a deliberate first tier, same as implementation_script
// was for automation; see docs/validation-checklist.md.
export const DIAGRAM_DELIVERABLE_TYPES: ReadonlySet<DeliverableType> = new Set(["high_level_design"]);

export function supportsArchitectureDiagram(type: DeliverableType): boolean {
  return DIAGRAM_DELIVERABLE_TYPES.has(type);
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  dlp: "Data Loss Prevention (DLP)",
  retention: "Retention Policies / Records Management",
  sensitivity_labels: "Sensitivity Labels",
  data_lifecycle_management: "Data Lifecycle Management",
  insider_risk_management: "Insider Risk Management",
  ediscovery: "eDiscovery",
  information_protection: "Information Protection",
  communication_compliance: "Communication Compliance",
  cloud_migration: "Cloud Migration (M365 & Azure)",
  app_modernization: "App Modernization (Power Platform & Azure DevOps)",
  sharepoint: "SharePoint (Strategy, Governance & Migration)",
  analytics_ai: "Analytics, Data & AI (Fabric, Copilot)",
};

// A consulting firm's practice areas (docs/PRD.md design-partner notes) —
// Data Security & Compliance is the original Purview-based scope; the
// rest were added so the platform reflects a firm's whole Microsoft
// practice, not just Purview. Purely presentational (groups the services checklist
// and intake form the same way DELIVERABLE_CATEGORY groups deliverables);
// no DB column backs this.
export const PRACTICE_AREAS = [
  "data_security_compliance",
  "cloud_migration",
  "app_modernization",
  "sharepoint",
  "analytics_ai",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  data_security_compliance: "Data Security & Compliance",
  cloud_migration: "Cloud Migration",
  app_modernization: "App Modernization",
  sharepoint: "SharePoint",
  analytics_ai: "Analytics, Data & AI",
};

export const SERVICE_PRACTICE_AREA: Record<ServiceType, PracticeArea> = {
  dlp: "data_security_compliance",
  retention: "data_security_compliance",
  sensitivity_labels: "data_security_compliance",
  data_lifecycle_management: "data_security_compliance",
  insider_risk_management: "data_security_compliance",
  ediscovery: "data_security_compliance",
  information_protection: "data_security_compliance",
  communication_compliance: "data_security_compliance",
  cloud_migration: "cloud_migration",
  app_modernization: "app_modernization",
  sharepoint: "sharepoint",
  analytics_ai: "analytics_ai",
};

export const INDUSTRY_OPTIONS = [
  "Healthcare",
  "Finance",
  "Government",
  "Defense",
  "Legal",
  "Insurance",
  "Technology",
  "Other",
] as const;

export const LICENSING_TIER_OPTIONS = [
  "M365 E3",
  "M365 E5",
  "Microsoft 365 Business Premium",
  "Office 365 E3",
  "Office 365 E5",
  "Other",
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  closed: "Closed",
};
