-- Row-Level Security (Sprint 1 / Epic A4)
-- See docs/ERD.md "Row-Level Security" section.
--
-- Account-scoped tables are restricted to the caller's own account via
-- users.account_id. Platform-managed tables (knowledge_base_entries,
-- prompt_templates) are authenticated-read / service-role-write.

create or replace function auth_account_id() returns uuid as $$
  select account_id from public.users where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- accounts ---------------------------------------------------------------
alter table accounts enable row level security;

create policy accounts_select_own on accounts
  for select using (id = auth_account_id());

create policy accounts_update_own on accounts
  for update using (id = auth_account_id());

-- users --------------------------------------------------------------------
alter table users enable row level security;

create policy users_select_own_account on users
  for select using (account_id = auth_account_id());

-- branding -------------------------------------------------------------
alter table branding enable row level security;

create policy branding_all_own_account on branding
  for all using (account_id = auth_account_id())
  with check (account_id = auth_account_id());

-- subscriptions ------------------------------------------------------
-- Read-only for the account; writes happen via the Stripe webhook
-- handler using the service role, which bypasses RLS.
alter table subscriptions enable row level security;

create policy subscriptions_select_own_account on subscriptions
  for select using (account_id = auth_account_id());

-- projects -------------------------------------------------------------
alter table projects enable row level security;

create policy projects_all_own_account on projects
  for all using (account_id = auth_account_id())
  with check (account_id = auth_account_id());

-- project_services -----------------------------------------------
alter table project_services enable row level security;

create policy project_services_all_via_project on project_services
  for all using (
    exists (
      select 1 from projects
      where projects.id = project_services.project_id
        and projects.account_id = auth_account_id()
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = project_services.project_id
        and projects.account_id = auth_account_id()
    )
  );

-- deliverables -------------------------------------------------------
alter table deliverables enable row level security;

create policy deliverables_all_via_project on deliverables
  for all using (
    exists (
      select 1 from projects
      where projects.id = deliverables.project_id
        and projects.account_id = auth_account_id()
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = deliverables.project_id
        and projects.account_id = auth_account_id()
    )
  );

-- deliverable_versions ---------------------------------------
alter table deliverable_versions enable row level security;

create policy deliverable_versions_all_via_deliverable on deliverable_versions
  for all using (
    exists (
      select 1 from deliverables
      join projects on projects.id = deliverables.project_id
      where deliverables.id = deliverable_versions.deliverable_id
        and projects.account_id = auth_account_id()
    )
  )
  with check (
    exists (
      select 1 from deliverables
      join projects on projects.id = deliverables.project_id
      where deliverables.id = deliverable_versions.deliverable_id
        and projects.account_id = auth_account_id()
    )
  );

-- deliverable_version_kb_entries -------------------------------
alter table deliverable_version_kb_entries enable row level security;

create policy deliverable_version_kb_entries_all_via_version
  on deliverable_version_kb_entries
  for all using (
    exists (
      select 1 from deliverable_versions
      join deliverables on deliverables.id = deliverable_versions.deliverable_id
      join projects on projects.id = deliverables.project_id
      where deliverable_versions.id = deliverable_version_kb_entries.deliverable_version_id
        and projects.account_id = auth_account_id()
    )
  );

-- generation_jobs ---------------------------------------------------
alter table generation_jobs enable row level security;

create policy generation_jobs_all_via_project on generation_jobs
  for all using (
    exists (
      select 1 from projects
      where projects.id = generation_jobs.project_id
        and projects.account_id = auth_account_id()
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = generation_jobs.project_id
        and projects.account_id = auth_account_id()
    )
  );

-- knowledge_base_entries -------------------------------------------
-- Platform-managed: any authenticated user can read, only the service
-- role (admin scripts / future admin UI) can write.
alter table knowledge_base_entries enable row level security;

create policy knowledge_base_entries_select_authenticated on knowledge_base_entries
  for select using (auth.role() = 'authenticated');

-- prompt_templates ---------------------------------------------------
alter table prompt_templates enable row level security;

create policy prompt_templates_select_authenticated on prompt_templates
  for select using (auth.role() = 'authenticated');
