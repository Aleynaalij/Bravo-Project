-- Sprint 2: expand the deliverable catalog with 3 service-specific
-- documents (docs/PRD.md §9 Phase 2). Adding enum values must be a
-- separate migration from anything that uses them — Postgres forbids
-- using a new enum value in the same transaction that added it.

alter type deliverable_type add value 'dlp_design';
alter type deliverable_type add value 'retention_strategy';
alter type deliverable_type add value 'sensitivity_labeling_plan';
