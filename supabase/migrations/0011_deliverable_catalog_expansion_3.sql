-- Sprint 2 (batch 3 of Phase 2, docs/PRD.md §9): Runbooks, CAB Request,
-- Change Management, Compliance Report — this completes the Phase 2
-- deliverable catalog. Same separate-migration requirement as 0007/0009 —
-- Postgres forbids using a new enum value in the same transaction that
-- added it.

alter type deliverable_type add value 'runbooks';
alter type deliverable_type add value 'cab_request';
alter type deliverable_type add value 'change_management';
alter type deliverable_type add value 'compliance_report';
