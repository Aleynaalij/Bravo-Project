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

// MVP supports these three deliverable types (Sprint 1); the full catalog
// from the vision doc lands in Phase 2 (see docs/PRD.md §9).
export const DELIVERABLE_TYPES = [
  "executive_summary",
  "statement_of_work",
  "high_level_design",
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_VERSION_SOURCES = [
  "ai_generated",
  "consultant_edited",
] as const;

export type DeliverableVersionSource = (typeof DELIVERABLE_VERSION_SOURCES)[number];
