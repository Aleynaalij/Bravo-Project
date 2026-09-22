-- SOP Generation Engine (EKS Phase 2, step 2/16): account-scoped reusable
-- SOP library, same ownership/RLS shape as knowledge_vault_entries/
-- knowledge_scripts/coding_standards (migrations 0027/0029) — a firm's own
-- library of standard operating procedures, not a per-engagement artifact,
-- so it isn't project-scoped like deliverables. source_project_id is an
-- optional pointer back to the engagement that prompted writing it (same
-- "outlives the project" on delete set null as knowledge_vault_entries.
-- project_id), not the thing that scopes visibility — account_id does that.
--
-- content is jsonb shaped like deliverable_versions.content
-- ({sections:[{heading,paragraphs}]}) — Zod-enforced (src/lib/validation/
-- sop.ts's sopContentSchema, reusing deliverableSectionSchema rather than
-- redefining it) against a fixed 12-heading structure (Purpose, Scope,
-- Roles, Responsibilities, Prerequisites, Procedure, Validation, Exception
-- Handling, Reporting, Escalation, References, Revision History) common to
-- every sop_type. This step ships manual CRUD only; AI generation
-- (src/lib/sop/generate.ts, step 3) and semantic search (embedding column,
-- step 11) land in later steps of this same phase — same
-- "add capability when the feature that uses it lands" precedent as
-- knowledge_scripts.is_approved_pattern.
--
-- updated_at exists from day one (unlike knowledge_vault_entries/
-- knowledge_scripts, which get it retrofitted in a later step of this
-- phase) — updateSop already needs a last-edited timestamp regardless of
-- the dashboard "aging content" tab that will later read it.
create table public.sops (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  sop_type text not null check (sop_type in (
    'daily_operations', 'dlp_administration', 'label_management', 'retention',
    'ediscovery', 'insider_risk', 'governance', 'change_management',
    'incident_response', 'user_provisioning', 'escalation')),
  title text not null,
  service_type public.service_type,
  status text not null default 'draft' check (status in ('draft', 'published')),
  content jsonb not null,
  prompt_template_version text,
  author_user_id uuid references public.users(id) on delete set null,
  author_email text not null,
  source_project_id uuid references public.projects(id) on delete set null,
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index sops_account_id_idx on public.sops (account_id);
create index sops_account_type_idx on public.sops (account_id, sop_type);
create index sops_author_user_id_idx on public.sops (author_user_id);
create index sops_source_project_id_idx on public.sops (source_project_id);

alter table public.sops enable row level security;

-- Same plain account-scoped, role-blind, all-four-verbs boundary as
-- knowledge_vault_entries/coding_standards — a firm's shared SOP library,
-- not gated by role.
create policy "sops_select"
  on public.sops
  for select
  using (account_id = auth_account_id());

create policy "sops_insert"
  on public.sops
  for insert
  with check (account_id = auth_account_id());

create policy "sops_update"
  on public.sops
  for update
  using (account_id = auth_account_id());

create policy "sops_delete"
  on public.sops
  for delete
  using (account_id = auth_account_id());
