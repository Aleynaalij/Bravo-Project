-- In-app support/contact channel (task #35). No helpdesk vendor account
-- exists in this environment, so this is real, owned infrastructure — a
-- request lands in this table and is visible to the submitter and to
-- platform admins, the same "build the real thing, not a vendor stub"
-- approach already used for audit_log and self-hosted usage analytics.
--
-- Any team member can submit, not just the account owner — asking for
-- help isn't an owner-only action the way billing/team management are.
--
-- submitter_email is a denormalized snapshot captured at write time, same
-- rationale as audit_log.actor_email: stays legible even if that user is
-- later removed from the team.
--
-- No delete policy for any role — a submitter withdrawing a request they
-- regret is a status change (see below), not a disappearance; deleting
-- support history isn't something either side should be able to do
-- silently.
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  submitter_user_id uuid references public.users(id) on delete set null,
  submitter_email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index support_requests_account_id_created_at_idx
  on public.support_requests (account_id, created_at desc);

create index support_requests_status_created_at_idx
  on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;

-- A submitter can read their own requests; any platform admin can read
-- every request across every account (there is no per-account "everyone
-- on my team sees every request" policy — a request is between its
-- submitter and support, the same boundary audit_log draws for
-- account-scoped rows).
create policy "support_requests_select"
  on public.support_requests
  for select
  using (
    submitter_user_id = (select auth.uid())
    or is_platform_admin()
  );

create policy "support_requests_insert"
  on public.support_requests
  for insert
  with check (
    submitter_user_id = (select auth.uid())
    and account_id = auth_account_id()
  );

-- Only a platform admin can transition status — a submitter marking their
-- own request "resolved" would let an unanswered request silently vanish
-- from the admin queue.
create policy "support_requests_update_admin"
  on public.support_requests
  for update
  using (is_platform_admin())
  with check (is_platform_admin());
