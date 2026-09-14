// Mirrors the enums defined in docs/openapi.yaml and docs/ERD.md.
// Keep these three files in sync when the deliverable/service catalog changes.

// MVP + Sprint 2 covered Bravo's Data Security & Compliance practice
// (the 8 Purview-based service types below) exclusively. This "Bravo
// practice areas" expansion adds one service per Bravo's other named
// practice areas (docs/PRD.md — see the design-partner notes), so the
// platform reflects the whole firm's Microsoft expertise, not just
// Purview. See PRACTICE_AREA in labels.ts for the grouping.
export const SERVICE_TYPES = [
  "dlp",
  "retention",
  "sensitivity_labels",
  "data_lifecycle_management",
  "insider_risk_management",
  "ediscovery",
  "information_protection",
  "communication_compliance",
  "cloud_migration",
  "app_modernization",
  "sharepoint",
  "analytics_ai",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// MVP shipped the first three (Sprint 1); Sprint 2 added the rest across
// three batches, completing the full Phase 2 catalog (docs/PRD.md §9).
// The Bravo practice-area expansion then added one flagship deliverable
// per new practice area, each gated to its matching service (see
// DELIVERABLE_REQUIRES_SERVICE in labels.ts) the same way DLP Design etc.
// are gated to their Purview service.
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
  "cloud_migration_plan",
  "app_modernization_plan",
  "sharepoint_governance_plan",
  "data_analytics_strategy",
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_VERSION_SOURCES = [
  "ai_generated",
  "consultant_edited",
] as const;

export type DeliverableVersionSource = (typeof DELIVERABLE_VERSION_SOURCES)[number];
