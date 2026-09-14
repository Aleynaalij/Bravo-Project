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

// MVP shipped the first three (Sprint 1); Sprint 2 added the 3
// service-specific design docs, then LLD/Testing Guide/UAT Plan/Rollback
// Procedures (docs/PRD.md §9 Phase 2). The remaining Phase 2 catalog
// (Runbooks, CAB Requests, Change Management, Compliance Reports) is still
// not started.
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
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_VERSION_SOURCES = [
  "ai_generated",
  "consultant_edited",
] as const;

export type DeliverableVersionSource = (typeof DELIVERABLE_VERSION_SOURCES)[number];
