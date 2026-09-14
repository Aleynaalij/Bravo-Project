// Mirrors the enums defined in docs/openapi.yaml and docs/ERD.md.
// Keep these three files in sync when the deliverable/service catalog changes.

export const SERVICE_TYPES = [
  "dlp",
  "retention",
  "sensitivity_labels",
  "data_lifecycle_management",
  "insider_risk_management",
  "ediscovery",
  "information_protection",
  "communication_compliance",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// MVP shipped the first three (Sprint 1); Sprint 2 added the rest across
// three batches, completing the full Phase 2 catalog (docs/PRD.md §9).
export const DELIVERABLE_TYPES = [
  "executive_summary",
  "statement_of_work",
  "high_level_design",
  "dlp_design",
  "retention_strategy",
  "sensitivity_labeling_plan",
  "low_level_design",
  "testing_guide",
  "uat_plan",
  "rollback_procedures",
  "runbooks",
  "cab_request",
  "change_management",
  "compliance_report",
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_VERSION_SOURCES = [
  "ai_generated",
  "consultant_edited",
] as const;

export type DeliverableVersionSource = (typeof DELIVERABLE_VERSION_SOURCES)[number];
