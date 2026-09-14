-- PurviewPilot.ai initial schema (Sprint 1 / Epic A)
-- Mirrors docs/ERD.md. Keep both in sync when this changes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type service_type as enum (
  'dlp',
  'retention',
  'sensitivity_labels',
  'data_lifecycle_management',
  'insider_risk_management',
  'ediscovery',
  'information_protection',
  'communication_compliance'
);

create type deliverable_type as enum (
  'executive_summary',
  'statement_of_work',
  'high_level_design'
);

create type deliverable_status as enum (
  'pending',
  'generating',
  'ready',
  'failed'
);

create type deliverable_version_source as enum (
  'ai_generated',
  'consultant_edited'
);

create type generation_job_status as enum (
  'queued',
  'in_progress',
  'succeeded',
  'failed'
);

-- ---------------------------------------------------------------------
-- Accounts & users
-- ---------------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  firm_name text,
  plan text not null default 'trial',
  created_at timestamptz not null default now()
);

-- One row per Supabase auth user, scoped to an account. MVP is
-- effectively 1:1 (see docs/ERD.md); kept distinct from accounts so
-- Phase 2 multi-seat accounts don't require a schema migration.
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create index users_account_id_idx on users (account_id);

create table branding (
  account_id uuid primary key references accounts (id) on delete cascade,
  logo_url text,
  primary_color text,
  firm_name_override text
);

create table subscriptions (
  account_id uuid primary key references accounts (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'trialing',
  plan text not null default 'trial',
  current_period_end timestamptz
);

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  customer_name text not null,
  industry text not null,
  user_count integer not null check (user_count > 0),
  licensing_tier text not null,
  geographic_locations text[] not null default '{}',
  compliance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_account_id_idx on projects (account_id);

create table project_services (
  project_id uuid not null references projects (id) on delete cascade,
  service_type service_type not null,
  primary key (project_id, service_type)
);

-- ---------------------------------------------------------------------
-- Prompt templates & knowledge base
-- ---------------------------------------------------------------------

create table prompt_templates (
  id uuid primary key default gen_random_uuid(),
  deliverable_type deliverable_type not null,
  version integer not null,
  section_schema jsonb not null,
  template_body text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (deliverable_type, version)
);

-- Only one active template per deliverable type at a time.
create unique index prompt_templates_one_active_per_type
  on prompt_templates (deliverable_type)
  where is_active;

create table knowledge_base_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_type service_type not null,
  industry text,
  content text not null,
  source_url text,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index knowledge_base_entries_service_industry_idx
  on knowledge_base_entries (service_type, industry);

-- ---------------------------------------------------------------------
-- Deliverables
-- ---------------------------------------------------------------------

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  type deliverable_type not null,
  current_version_id uuid,
  status deliverable_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (project_id, type)
);

create index deliverables_project_id_idx on deliverables (project_id);

create table deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables (id) on delete cascade,
  version_number integer not null,
  source deliverable_version_source not null,
  content jsonb not null,
  prompt_template_version text,
  created_at timestamptz not null default now(),
  unique (deliverable_id, version_number)
);

create index deliverable_versions_deliverable_id_idx
  on deliverable_versions (deliverable_id, version_number desc);

alter table deliverables
  add constraint deliverables_current_version_fk
  foreign key (current_version_id) references deliverable_versions (id)
  on delete set null;

create table deliverable_version_kb_entries (
  deliverable_version_id uuid not null references deliverable_versions (id) on delete cascade,
  knowledge_base_entry_id uuid not null references knowledge_base_entries (id) on delete cascade,
  primary key (deliverable_version_id, knowledge_base_entry_id)
);

create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  deliverable_type deliverable_type not null,
  status generation_job_status not null default 'queued',
  result_deliverable_id uuid references deliverables (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generation_jobs_project_status_idx
  on generation_jobs (project_id, status);

-- ---------------------------------------------------------------------
-- updated_at trigger for projects
-- ---------------------------------------------------------------------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();
