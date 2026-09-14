-- Bravo practice-area expansion: the platform covered only Bravo's Data
-- Security & Compliance practice (Purview) until now. Adds one service per
-- Bravo's other named practice areas (bravocg.com: Cloud Services/Cloud
-- Migration, App Modernization, SharePoint, Analytics/Data/AI) and one
-- flagship deliverable per new service, gated the same way DLP Design etc.
-- are gated to their Purview service.
--
-- Enum-add-then-use must be separate migrations/transactions (Postgres
-- restriction, same as every prior catalog expansion) — this migration
-- only adds enum values; 0014 adds the content that uses them.

alter type service_type add value 'cloud_migration';
alter type service_type add value 'app_modernization';
alter type service_type add value 'sharepoint';
alter type service_type add value 'analytics_ai';

alter type deliverable_type add value 'cloud_migration_plan';
alter type deliverable_type add value 'app_modernization_plan';
alter type deliverable_type add value 'sharepoint_governance_plan';
alter type deliverable_type add value 'data_analytics_strategy';
