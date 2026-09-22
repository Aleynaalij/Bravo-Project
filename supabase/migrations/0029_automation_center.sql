-- Automation Center: Coding Standards Templates + AI-call history backing
-- two new features, Code Auditor and Code Creator, plus two additive
-- columns on the existing knowledge_scripts (Script Vault) table.
--
-- Coding Standards Templates are private per account, same boundary as
-- knowledge_vault_entries/knowledge_scripts (migration 0027) — each firm's
-- own definition of "how WE write PowerShell," not a platform-wide
-- standard. One row per script_type per account (the unique constraint
-- below): Code Auditor grades pasted code against it, Code Creator
-- generates code that satisfies it.
create table public.coding_standards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  script_type text not null,
  required_elements text[] not null default '{}',
  notes text,
  author_user_id uuid references public.users(id) on delete set null,
  author_email text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (account_id, script_type)
);

create index coding_standards_account_id_idx
  on public.coding_standards (account_id);
create index coding_standards_author_user_id_idx
  on public.coding_standards (author_user_id);

alter table public.coding_standards enable row level security;

create policy "coding_standards_select"
  on public.coding_standards
  for select
  using (account_id = auth_account_id());

create policy "coding_standards_insert"
  on public.coding_standards
  for insert
  with check (account_id = auth_account_id());

create policy "coding_standards_update"
  on public.coding_standards
  for update
  using (account_id = auth_account_id());

create policy "coding_standards_delete"
  on public.coding_standards
  for delete
  using (account_id = auth_account_id());

-- automation_requests is the AI-call log for both Code Auditor and Code
-- Creator — it serves double duty as both the history a user browses back
-- through and the counter Automation Center's own rate limiter reads
-- (src/lib/automation/rate-limit.ts), the same dual role generation_jobs
-- already plays for deliverable generation. Deliberately not reusing
-- generation_jobs itself: that table is shaped around a project and a
-- closed deliverable_type enum, and Automation Center calls are
-- account-level, not tied to any one project. Append-only in the app
-- layer (no update/delete policy) — a request's outcome is recorded once,
-- not edited after the fact.
create table public.automation_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text not null,
  feature text not null check (feature in ('code_audit', 'code_generate')),
  script_type text,
  environment_profile text,
  input text not null,
  output jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index automation_requests_account_created_idx
  on public.automation_requests (account_id, created_at desc);
create index automation_requests_user_id_idx
  on public.automation_requests (user_id);

alter table public.automation_requests enable row level security;

create policy "automation_requests_select"
  on public.automation_requests
  for select
  using (account_id = auth_account_id());

create policy "automation_requests_insert"
  on public.automation_requests
  for insert
  with check (account_id = auth_account_id());

-- The user's "Approved Patterns" concept — a vetted, reusable script flag
-- — and a source marker distinguishing a hand-entered script from one
-- Code Creator generated and its author promoted into the vault. Additive
-- columns on the existing table rather than a parallel patterns table;
-- no data backfill needed, every existing row is a real hand-entered
-- script authored before either feature existed.
alter table public.knowledge_scripts
  add column is_approved_pattern boolean not null default false,
  add column source text not null default 'manual'
    check (source in ('manual', 'ai_generated', 'promoted'));
