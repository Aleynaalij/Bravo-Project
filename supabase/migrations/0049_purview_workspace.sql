-- Purview workspace and atomic project setup. All writes use the caller's account.
create or replace function public.create_project_with_services(
  p_account_id uuid, p_customer_name text, p_industry text, p_user_count integer,
  p_licensing_tier text, p_geographic_locations text[], p_compliance_notes text,
  p_services public.service_type[]
) returns public.projects
language plpgsql security invoker set search_path = public as $$
declare new_project public.projects;
begin
  if p_account_id is distinct from public.auth_account_id() or cardinality(p_services) < 1 then
    raise exception 'Project account or services invalid';
  end if;
  insert into public.projects(account_id, customer_name, industry, user_count, licensing_tier,
    geographic_locations, compliance_notes)
  values (p_account_id, p_customer_name, p_industry, p_user_count, p_licensing_tier,
    p_geographic_locations, p_compliance_notes) returning * into new_project;
  insert into public.project_services(project_id, service_type)
  select new_project.id, service from unnest(p_services) as service;
  return new_project;
end $$;

create or replace function public.replace_project_services(p_project_id uuid, p_services public.service_type[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  if cardinality(p_services) < 1 or not exists (
    select 1 from public.projects where id = p_project_id
      and account_id = public.auth_account_id() and status = 'active'
  ) then raise exception 'Project unavailable or services invalid'; end if;
  delete from public.project_services where project_id = p_project_id;
  insert into public.project_services(project_id, service_type)
  select p_project_id, service from unnest(p_services) as service;
end $$;

revoke all on function public.create_project_with_services(uuid,text,text,integer,text,text[],text,public.service_type[]) from public, anon;
grant execute on function public.create_project_with_services(uuid,text,text,integer,text,text[],text,public.service_type[]) to authenticated;
revoke all on function public.replace_project_services(uuid,public.service_type[]) from public, anon;
grant execute on function public.replace_project_services(uuid,public.service_type[]) to authenticated;

create table public.purview_project_profiles (
  project_id uuid primary key references public.projects(id) on delete cascade,
  cloud text not null default 'unknown' check (cloud in ('unknown','commercial','gcc','gcc_high','dod','other')),
  tenant_label text not null default '',
  current_state text not null default '',
  target_state text not null default '',
  licensing_notes text not null default '',
  constraints text not null default '',
  updated_at timestamptz not null default now()
);

create table public.purview_work_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('task','risk','decision','milestone','evidence')),
  workstream text not null check (workstream in ('dlp','retention','labels','ediscovery','other')),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  owner_name text not null default '',
  due_date date,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purview_work_items_project_idx on public.purview_work_items(project_id, created_at desc);

-- Manually supplied, authorized, read-only inventory; no Graph tokens or tenant credentials stored.
create table public.purview_discovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source text not null default 'manual_inventory' check (source = 'manual_inventory'),
  cloud text not null check (cloud in ('commercial','gcc','gcc_high','dod','other')),
  tenant_label text not null,
  permission_reference text not null,
  captured_at timestamptz not null,
  inventory jsonb not null,
  imported_at timestamptz not null default now()
);
create index purview_snapshots_project_idx on public.purview_discovery_snapshots(project_id, imported_at desc);

alter table public.purview_project_profiles enable row level security;
alter table public.purview_work_items enable row level security;
alter table public.purview_discovery_snapshots enable row level security;
create policy profile_account on public.purview_project_profiles for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()));
create policy items_account on public.purview_work_items for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()));
create policy snapshots_account on public.purview_discovery_snapshots for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.account_id = public.auth_account_id()));
