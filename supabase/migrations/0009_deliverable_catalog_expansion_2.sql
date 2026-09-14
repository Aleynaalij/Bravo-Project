-- Sprint 2 (batch 2 of Phase 2, docs/PRD.md §9): Low-Level Design, Testing
-- Guide, UAT Plan, Rollback Procedures. Same separate-migration requirement
-- as 0007 — Postgres forbids using a new enum value in the same
-- transaction that added it.

alter type deliverable_type add value 'low_level_design';
alter type deliverable_type add value 'testing_guide';
alter type deliverable_type add value 'uat_plan';
alter type deliverable_type add value 'rollback_procedures';
