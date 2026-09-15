-- Self-hosted usage analytics (audit's Future Improvements tier — the
-- audit's own named gap: "no way to know which deliverable types are
-- actually used, where consultants drop off, or whether generated content
-- gets edited heavily"). No PostHog/Amplitude/GA — everything the admin
-- Metrics page (src/app/admin/metrics) shows is either aggregated
-- directly from data this project already collects (generation_jobs,
-- deliverable_versions.source, project_services,
-- deliverable_version_kb_entries — deliberately NOT re-logged into a
-- parallel event stream) or, for the one genuinely missing signal —
-- whether a generated deliverable is ever actually exported/downloaded —
-- this new table.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index usage_events_event_type_created_at_idx
  on public.usage_events (event_type, created_at desc);

create index usage_events_account_id_idx
  on public.usage_events (account_id);

alter table public.usage_events enable row level security;

-- Platform-wide business intelligence, not a per-account feature — an
-- account owner has no equivalent view of this data for their own
-- account either, so this is admin-only rather than owner-or-admin the
-- way audit_log's reads are.
create policy "usage_events_select"
  on public.usage_events
  for select
  using (is_platform_admin());

-- Any authenticated user can log an event for their own account (not
-- owner-gated — any teammate exporting a deliverable is real usage worth
-- counting, the same way any teammate can already generate one).
create policy "usage_events_insert"
  on public.usage_events
  for insert
  with check (account_id = auth_account_id());
