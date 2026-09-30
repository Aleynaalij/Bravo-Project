# Purview workspace rollout

## Apply before deploying

Run `supabase/migrations/0049_purview_workspace.sql` in the target Supabase project using the established migration process. The application calls `create_project_with_services` and `replace_project_services` after this change; deploy the migration before the app. Do not merge the app first.

The migration adds account-scoped project baseline, work item, and discovery snapshot tables. All new tables have row level security. Project and service writes are performed in one database transaction, so a failed service insert cannot leave an empty project or erase existing scope.

## Synthetic acceptance pass

Use a test account and synthetic customer. Create a project with two services and verify both persist. Change to one service, reload, and verify the scope. Open its Purview workspace, save a baseline, create a task, risk, decision, milestone and evidence entry, move an item through statuses, then reload. Import the sample aggregate inventory with a fictional authorization reference and confirm the four counts display. Try a JSON document with an extra `tenantId` or policy name; it must be rejected. Close the project after a synthetic Knowledge Vault capture; confirm the workboard and baseline are read-only. Repeat the project/export/review isolation checks with two separate projects and a regenerated deliverable. Delete the synthetic project when finished.

The live account's trial status and AI configuration determine whether a generation/export acceptance test can run. This branch has not been connected to a real tenant, and no customer data should be used for this pass.

## Discovery boundary

The import is a manually supplied read-only aggregate snapshot. It accepts a cloud label, a friendly tenant label, timestamp, four counts, and an authorization reference. It rejects extra JSON fields and does not store Microsoft credentials or call Graph. A future live connector requires a registered application, delegated permission/consent, cloud-specific endpoint and capability review, token handling, and a separate security review before it is enabled. The UI must not describe the manual import as live tenant discovery.

## Outstanding owner decisions

The published privacy policy still contains legal entity, contact, date, and hosting-region placeholders. Replace these with verified business details before relying on the policy for client data. Verify the AI provider, data handling terms, licensing, tenant cloud, and project authorization before entering sensitive Purview material. The workspace is a planning aid, not a source of tenant configuration truth.
