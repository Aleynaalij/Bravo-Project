-- Security hardening (Sprint 1 / Epic A4 follow-up)
-- Addresses Supabase security advisor findings on the initial schema:
--   - function_search_path_mutable on set_updated_at
--   - SECURITY DEFINER functions directly callable via PostgREST RPC

alter function set_updated_at() set search_path = public;

-- auth_account_id() stays SECURITY DEFINER and remains callable by
-- `authenticated` (revoked only from anon/public below): it must bypass
-- RLS on `users` to avoid infinite recursion, since the `users` table's
-- own select policy calls this function. A signed-in user calling it
-- directly via RPC only ever gets back their own account_id, so this is
-- an accepted, intentional finding — not a privilege escalation path.
revoke execute on function auth_account_id() from public, anon;
grant execute on function auth_account_id() to authenticated;

-- handle_new_auth_user() is a trigger function only; the trigger manager
-- invokes it without needing PostgREST-level EXECUTE privileges, so it's
-- safe to revoke entirely.
revoke execute on function handle_new_auth_user() from public, anon, authenticated;
