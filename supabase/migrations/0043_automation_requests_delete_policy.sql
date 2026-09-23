-- Code Creator's new request history (migration 0042) needs a way to
-- remove entries, same as any other list a user owns — automation_requests
-- had no DELETE policy at all (it originally shipped select+insert-only,
-- migration 0042 added update for the insert-then-update result-recording
-- pattern; delete was never added since nothing needed it until the
-- history UI did).

create policy automation_requests_delete on public.automation_requests
  for delete
  using (account_id = auth_account_id());
