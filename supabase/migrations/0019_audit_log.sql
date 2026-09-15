-- Real audit-log table, distinct from deliverable_versions (content
-- history) — closes one of the audit's Phase 1 "Important Gaps": an admin
-- changing a shared knowledge base entry, an owner removing a teammate,
-- and a role change all currently leave no queryable trail beyond
-- Supabase's own platform-level auth logs.
--
-- account_id is nullable: platform-admin actions (knowledge base edits)
-- aren't scoped to any one account, so they're written with account_id
-- null and read back by platform admins instead of an account owner.
--
-- actor_email is a denormalized snapshot captured at write time (not just
-- a join to users.email) so an entry stays legible after the actor is
-- removed from the account — actor_user_id alone would go stale the
-- moment removeTeamMemberAction deletes that very user.
--
-- No update/delete policy is defined on purpose: this table is
-- insert-and-read only for every role, owners included. An audit trail
-- that the people it's watching can edit isn't one.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_account_id_created_at_idx
  on public.audit_log (account_id, created_at desc);

create index audit_log_actor_user_id_idx
  on public.audit_log (actor_user_id);

alter table public.audit_log enable row level security;

create policy "audit_log_select"
  on public.audit_log
  for select
  using (
    (account_id is not null and account_id = auth_account_id() and auth_is_owner())
    or (account_id is null and is_platform_admin())
  );

create policy "audit_log_insert"
  on public.audit_log
  for insert
  with check (
    actor_user_id = (select auth.uid())
    and (
      (account_id is not null and account_id = auth_account_id() and auth_is_owner())
      or (account_id is null and is_platform_admin())
    )
  );
