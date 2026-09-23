-- Real bug found while investigating a Code Creator timeout report:
-- automation_requests and eks_requests both only had SELECT/INSERT RLS
-- policies (docs/ERD.md called this "append-only," matching audit_log's
-- genuinely-append-only convention) — but runCodeCreator, runCodeAudit,
-- runTroubleshoot, and runArchitectureAdvisor all insert a row up front
-- and then .update() it with output/error_message once the AI call
-- settles. Without an UPDATE policy, every one of those updates has been
-- silently affecting zero rows under RLS (the JS client doesn't throw on
-- a no-op update) — output and error_message were never actually being
-- persisted, on success OR failure, since either table's insert-then-
-- update pattern first existed. The in-request response the user saw was
-- always the Server Action's own return value, never a re-read of the
-- row, which is why this went unnoticed until building a history view
-- that reads output back from the table exposed it.
--
-- This was an implementation/RLS mismatch, not the deliberate
-- append-only design audit_log actually uses (audit_log's own actions
-- never try to update a row after inserting it) — fixing it here rather
-- than changing the four call sites to stop trying to record their own
-- results.

create policy automation_requests_update on public.automation_requests
  for update
  using (account_id = auth_account_id())
  with check (account_id = auth_account_id());

create policy eks_requests_update on public.eks_requests
  for update
  using (account_id = auth_account_id())
  with check (account_id = auth_account_id());
