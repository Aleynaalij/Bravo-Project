-- Multi-seat team support (PRD §9/§11: Bravo is a ~46-person firm — one
-- individual MVP account doesn't get the firm using the product).
--
-- The account/user split was already designed for this back in Sprint 1
-- ("kept distinct from accounts so Phase 2 multi-seat accounts don't
-- require a schema migration" — see docs/ERD.md), and every account-scoped
-- RLS policy already keys off auth_account_id() rather than a specific
-- user id, so a second users row under the same account_id already gets
-- full access to that account's projects/deliverables/branding for free.
-- What's actually missing: a constrained role, a way for an owner to
-- manage teammates, and an auth-trigger branch so an invited user joins
-- the inviter's existing account instead of getting a brand-new one (today
-- handle_new_auth_user() unconditionally creates a fresh account for every
-- new auth.users row).
--
-- No seat limit is enforced — same "no numeric limits until there's real
-- usage data to size them against" decision as FR-16 (docs/PRD.md §9).

alter table users add constraint users_role_check check (role in ('owner', 'member'));

-- SECURITY DEFINER for the same reason as auth_account_id() (0004) and
-- is_platform_admin() (0006): a policy defined ON users can't safely query
-- users again without bypassing RLS, or it recurses into itself. A signed-
-- in user calling this via RPC only ever learns their own role — not a
-- privilege escalation path.
create or replace function auth_is_owner() returns boolean as $$
  select coalesce((select role from public.users where id = auth.uid()) = 'owner', false);
$$ language sql stable security definer set search_path = public;

revoke execute on function auth_is_owner() from public, anon;
grant execute on function auth_is_owner() to authenticated;

-- Lets an owner promote/demote a teammate's role. Removing a teammate
-- entirely goes through the Supabase Auth admin API instead (deleting the
-- auth.users row cascades to this table via the existing FK) rather than a
-- direct delete here, so there's no matching delete policy to add.
create policy users_owner_manage_role on users
  for update using (account_id = auth_account_id() and auth_is_owner())
  with check (account_id = auth_account_id());

create or replace function handle_new_auth_user() returns trigger as $$
declare
  new_account_id uuid;
  target_account_id uuid;
begin
  target_account_id := (new.raw_user_meta_data ->> 'invited_account_id')::uuid;

  if target_account_id is not null
     and exists (select 1 from public.accounts where id = target_account_id) then
    insert into public.users (id, account_id, email, role)
    values (new.id, target_account_id, new.email, 'member');
  else
    insert into public.accounts (email, plan)
    values (new.email, 'trial')
    returning id into new_account_id;

    insert into public.users (id, account_id, email, role)
    values (new.id, new_account_id, new.email, 'owner');
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
