-- Platform admin flag + write access to the shared Knowledge Base and
-- prompt templates (Sprint 2: Knowledge Base admin UI).
--
-- knowledge_base_entries and prompt_templates are platform-managed tables
-- (shared across every account, per docs/ERD.md) — until now only writable
-- via direct SQL migration (see docs/sprint-1-plan.md Epic C5). This adds
-- a minimal admin flag and RLS policies so an admin can manage them
-- through the app instead.

alter table users add column is_platform_admin boolean not null default false;

update users set is_platform_admin = true where email = 'aleynajali@outlook.com';

-- SECURITY DEFINER for the same reason as auth_account_id() (0004): a
-- signed-in user calling this directly via RPC only ever gets back their
-- own is_platform_admin flag — not a privilege escalation path. Accepted,
-- same as auth_account_id()'s documented finding.
create or replace function is_platform_admin() returns boolean as $$
  select coalesce((select u.is_platform_admin from public.users u where u.id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

revoke execute on function is_platform_admin() from public, anon;
grant execute on function is_platform_admin() to authenticated;

-- knowledge_base_entries: authenticated-read already exists (0002); add
-- admin-only write.
create policy knowledge_base_entries_admin_write on knowledge_base_entries
  for all using (is_platform_admin())
  with check (is_platform_admin());

-- prompt_templates: authenticated-read already exists (0002); add
-- admin-only write.
create policy prompt_templates_admin_write on prompt_templates
  for all using (is_platform_admin())
  with check (is_platform_admin());
