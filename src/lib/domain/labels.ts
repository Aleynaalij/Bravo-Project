import type { DeliverableType, ServiceType } from "./enums";

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
};

// Deliverable types that only make sense when a specific service is in
// scope (unlike Executive Summary/SOW/HLD, which apply regardless).
// Generation offers these only when the mapped service is selected —
// generating e.g. a DLP Design for a project with no DLP in scope would
// have nothing real to draw on.
export const DELIVERABLE_REQUIRES_SERVICE: Partial<Record<DeliverableType, ServiceType>> = {
  dlp_design: "dlp",
  retention_strategy: "retention",
  sensitivity_labeling_plan: "sensitivity_labels",
};

export const DELIVERABLE_CATEGORIES = ["core", "design", "process", "compliance"] as const;
export type DeliverableCategory = (typeof DELIVERABLE_CATEGORIES)[number];

export const DELIVERABLE_CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  core: "Core",
  design: "Design",
  process: "Testing & Change",
  compliance: "Compliance",
};

// Groups the catalog for the generate form's module-card layout — purely
// presentational, doesn't affect what gets generated or how.
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
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  dlp: "Data Loss Prevention (DLP)",
  retention: "Retention Policies / Records Management",
  sensitivity_labels: "Sensitivity Labels",
  data_lifecycle_management: "Data Lifecycle Management",
  insider_risk_management: "Insider Risk Management",
  ediscovery: "eDiscovery",
  information_protection: "Information Protection",
  communication_compliance: "Communication Compliance",
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
