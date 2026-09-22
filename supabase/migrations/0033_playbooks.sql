-- Playbook Library (EKS Phase 2, step 4/16): account-scoped reusable
-- playbook library, identical shape to sops (migration 0032) — a firm's
-- own deployment/rollout playbooks (DLP deployment, records management,
-- insider risk, etc.), reused across engagements rather than written
-- per-project. See 0032_sops.sql's doc comment for the full rationale
-- (account-scoped like coding_standards, not project-scoped like
-- deliverables); it applies identically here.
--
-- content follows the same jsonb {sections:[{heading,paragraphs}]} shape,
-- Zod-enforced (src/lib/validation/playbook.ts's playbookContentSchema,
-- reusing deliverableSectionSchema) against a fixed 12-heading structure
-- specific to a playbook (Discovery, Requirements, Planning, Design,
-- Implementation, Testing, Pilot, Rollout, Monitoring, Operations, Success
-- Criteria, Lessons Learned) — different from an SOP's 12 headings, since
-- a playbook walks a deployment project through phases where an SOP
-- documents a repeatable operational procedure. Same "manual CRUD first,
-- AI generation and embedding land in later steps" sequencing as sops.
create table public.playbooks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  playbook_type text not null check (playbook_type in (
    'dlp_deployment', 'records_management', 'insider_risk',
    'communication_compliance', 'ediscovery', 'information_protection')),
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

create index playbooks_account_id_idx on public.playbooks (account_id);
create index playbooks_account_type_idx on public.playbooks (account_id, playbook_type);
create index playbooks_author_user_id_idx on public.playbooks (author_user_id);
create index playbooks_source_project_id_idx on public.playbooks (source_project_id);

alter table public.playbooks enable row level security;

create policy "playbooks_select"
  on public.playbooks
  for select
  using (account_id = auth_account_id());

create policy "playbooks_insert"
  on public.playbooks
  for insert
  with check (account_id = auth_account_id());

create policy "playbooks_update"
  on public.playbooks
  for update
  using (account_id = auth_account_id());

create policy "playbooks_delete"
  on public.playbooks
  for delete
  using (account_id = auth_account_id());
