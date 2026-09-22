-- Shared request-log table for the EKS reasoning-layer family (EKS Phase
-- 2, step 6/16): Troubleshooting Engine (step 7) and Architecture Advisor
-- (step 8). Deliberately NOT a widened automation_requests — that table's
-- shape and its own independent rate limit (src/lib/automation/
-- rate-limit.ts) are specifically Automation Center's; EKS reasoning calls
-- are a third, structurally different usage pattern (they optionally link
-- back to a project and cross-reference Knowledge Vault entries neither
-- automation_requests nor generation_jobs do) and get their own budget for
-- the same reason Automation Center didn't share generation_jobs's.
create table public.eks_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text not null,
  feature text not null check (feature in ('troubleshoot', 'architecture_advisor')),
  project_id uuid references public.projects(id) on delete set null,
  input jsonb not null,
  output jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index eks_requests_account_created_idx
  on public.eks_requests (account_id, created_at desc);
create index eks_requests_user_id_idx
  on public.eks_requests (user_id);
create index eks_requests_project_id_idx
  on public.eks_requests (project_id);

alter table public.eks_requests enable row level security;

-- Append-only in the app layer (no update/delete policy) — same
-- convention as automation_requests/audit_log: a request's outcome is
-- recorded once, not edited after the fact.
create policy "eks_requests_select"
  on public.eks_requests
  for select
  using (account_id = auth_account_id());

create policy "eks_requests_insert"
  on public.eks_requests
  for insert
  with check (account_id = auth_account_id());

-- Mirrors deliverable_version_kb_entries exactly — records which vault
-- entries searchVault surfaced as "similar historical issues" for a
-- troubleshoot request. This is what the Institutional Knowledge Risk /
-- Knowledge dashboard tab's "most cross-referenced content" metric reads
-- from (later steps of this phase), so it lands now rather than being
-- retrofitted once that metric needs it.
create table public.eks_request_vault_entries (
  eks_request_id uuid not null references public.eks_requests(id) on delete cascade,
  knowledge_vault_entry_id uuid not null references public.knowledge_vault_entries(id) on delete cascade,
  primary key (eks_request_id, knowledge_vault_entry_id)
);

create index eks_request_vault_entries_vault_entry_id_idx
  on public.eks_request_vault_entries (knowledge_vault_entry_id);

alter table public.eks_request_vault_entries enable row level security;

-- Same "check ownership via the parent row" pattern as
-- deliverable_version_kb_entries_all_via_version (migration 0002) — no
-- account_id column of its own, so RLS goes through eks_requests. Select +
-- insert only, matching eks_requests' own append-only shape: these rows
-- are written once, when the request completes, never edited or removed
-- independently.
create policy "eks_request_vault_entries_select"
  on public.eks_request_vault_entries
  for select
  using (
    exists (
      select 1 from public.eks_requests
      where eks_requests.id = eks_request_vault_entries.eks_request_id
        and eks_requests.account_id = auth_account_id()
    )
  );

create policy "eks_request_vault_entries_insert"
  on public.eks_request_vault_entries
  for insert
  with check (
    exists (
      select 1 from public.eks_requests
      where eks_requests.id = eks_request_vault_entries.eks_request_id
        and eks_requests.account_id = auth_account_id()
    )
  );
