-- Expert Knowledge System (EKS) MVP: a private, per-account institutional-
-- memory vault — lessons learned and incidents a consulting firm's own
-- team captures from its own engagements, plus a reusable script library.
-- Deliberately NOT an extension of knowledge_base_entries: that table is
-- global, admin-authored reference content shared by every account and
-- read by the AI generation pipeline (src/lib/generation/knowledge-base.ts).
-- This is the opposite shape — private per account, authored by that
-- account's own team, and never visible to another account or (unlike
-- knowledge_base_entries) to platform admins either. A platform admin
-- manages the shared reference KB; they get no special read access to a
-- customer's own captured institutional memory, same tenant-isolation
-- boundary every account-scoped table in this app already draws.
--
-- knowledge_vault_entries unifies "lessons learned" and "incidents" as one
-- table with an entry_type discriminator rather than two near-duplicate
-- tables — the two share the large majority of fields (title, symptoms,
-- root cause, resolution, environment, tags, service), and this codebase
-- already prefers one discriminated table over per-variant tables
-- (generation_jobs covers every deliverable_type the same way). Fields
-- that only make sense for one entry_type (impact/severity/escalation_path
-- for incidents; preventative_controls/lessons_learned for lessons
-- learned) are simply nullable rather than forcing a schema split.
--
-- confidence_score is the author's own 1-5 self-rating of how solid this
-- entry is — never an AI-computed score. Same "real signal only, nothing
-- fabricated" stance as every other heuristic in this app (see Delivery
-- Risk, Security Score): a machine-generated confidence number here would
-- be presenting a guess as a measurement.
create table public.knowledge_vault_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  entry_type text not null check (entry_type in ('lesson_learned', 'incident')),
  title text not null,
  service_type public.service_type,
  industry text,
  project_id uuid references public.projects(id) on delete set null,
  author_user_id uuid references public.users(id) on delete set null,
  author_email text not null,
  environment text,
  symptoms text,
  root_cause text,
  troubleshooting_steps text,
  resolution text,
  validation_steps text,
  preventative_controls text,
  lessons_learned text,
  impact text,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  escalation_path text,
  time_to_resolution_minutes integer,
  confidence_score integer check (confidence_score between 1 and 5),
  source_url text,
  tags text[] not null default '{}',
  embedding vector(1536),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index knowledge_vault_entries_account_id_idx
  on public.knowledge_vault_entries (account_id);
create index knowledge_vault_entries_account_type_idx
  on public.knowledge_vault_entries (account_id, entry_type);
create index knowledge_vault_entries_tags_idx
  on public.knowledge_vault_entries using gin (tags);
-- Covers the two FKs the Supabase advisor otherwise flags as unindexed.
create index knowledge_vault_entries_author_user_id_idx
  on public.knowledge_vault_entries (author_user_id);
create index knowledge_vault_entries_project_id_idx
  on public.knowledge_vault_entries (project_id);
-- Same HNSW-over-ivfflat reasoning as knowledge_base_entries (migration
-- 0022): no per-account table will have enough rows for ivfflat's
-- representative-data-at-build-time requirement to hold, and HNSW doesn't
-- need it.
create index knowledge_vault_entries_embedding_idx
  on public.knowledge_vault_entries
  using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_vault_entries enable row level security;

-- Plain account-scoping, role-blind, all four verbs — the same boundary
-- projects/deliverables already draw: everything except billing, team
-- management, and account deletion is shared across a team, and there's
-- no reason a lesson one teammate captured should be hidden from another
-- teammate on the same account.
create policy "knowledge_vault_entries_select"
  on public.knowledge_vault_entries
  for select
  using (account_id = auth_account_id());

create policy "knowledge_vault_entries_insert"
  on public.knowledge_vault_entries
  for insert
  with check (account_id = auth_account_id());

create policy "knowledge_vault_entries_update"
  on public.knowledge_vault_entries
  for update
  using (account_id = auth_account_id());

create policy "knowledge_vault_entries_delete"
  on public.knowledge_vault_entries
  for delete
  using (account_id = auth_account_id());

-- Reusable script library (PowerShell / Graph API / KQL / IaC), separate
-- from knowledge_vault_entries since a script is a code artifact with its
-- own metadata (risk level, rollback steps) rather than narrative
-- knowledge — and separate from the existing implementation_script
-- deliverable type, which is a one-off per-project generated document, not
-- a standalone, reusable, tagged library entry.
create table public.knowledge_scripts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  description text not null,
  script_type text not null check (script_type in
    ('powershell', 'graph_api', 'kql', 'json', 'terraform', 'bicep', 'arm_template')),
  service_type public.service_type,
  content text not null,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  dependencies text,
  validation_steps text,
  rollback_steps text,
  author_user_id uuid references public.users(id) on delete set null,
  author_email text not null,
  tags text[] not null default '{}',
  embedding vector(1536),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index knowledge_scripts_account_id_idx
  on public.knowledge_scripts (account_id);
create index knowledge_scripts_account_type_idx
  on public.knowledge_scripts (account_id, script_type);
create index knowledge_scripts_tags_idx
  on public.knowledge_scripts using gin (tags);
create index knowledge_scripts_author_user_id_idx
  on public.knowledge_scripts (author_user_id);
create index knowledge_scripts_embedding_idx
  on public.knowledge_scripts
  using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_scripts enable row level security;

create policy "knowledge_scripts_select"
  on public.knowledge_scripts
  for select
  using (account_id = auth_account_id());

create policy "knowledge_scripts_insert"
  on public.knowledge_scripts
  for insert
  with check (account_id = auth_account_id());

create policy "knowledge_scripts_update"
  on public.knowledge_scripts
  for update
  using (account_id = auth_account_id());

create policy "knowledge_scripts_delete"
  on public.knowledge_scripts
  for delete
  using (account_id = auth_account_id());

-- Unlike match_knowledge_base_entries (0022), which is fine at Supabase's
-- default grants because every authenticated user can already read every
-- row it touches, these two run over account-scoped, RLS-protected
-- tables — deliberately left as ordinary (not security definer) functions
-- so they execute as the calling user and inherit knowledge_vault_entries'
-- / knowledge_scripts' own RLS policies automatically. No account_id
-- parameter exists to pass wrong; the row-visibility boundary is the same
-- one every other query against these tables already gets for free.
create or replace function public.match_knowledge_vault_entries(
  query_embedding vector(1536),
  filter_entry_types text[] default null,
  match_count int default 8
)
returns setof public.knowledge_vault_entries
language sql
stable
set search_path = public, extensions
as $$
  select *
  from public.knowledge_vault_entries
  where (filter_entry_types is null or entry_type = any(filter_entry_types))
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_knowledge_scripts(
  query_embedding vector(1536),
  filter_script_types text[] default null,
  match_count int default 8
)
returns setof public.knowledge_scripts
language sql
stable
set search_path = public, extensions
as $$
  select *
  from public.knowledge_scripts
  where (filter_script_types is null or script_type = any(filter_script_types))
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
