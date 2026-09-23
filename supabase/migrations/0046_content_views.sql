-- Tracks who opened a piece of Knowledge Vault content (a lesson/incident
-- entry, a script, a SOP, or a playbook) — distinct from every existing
-- "usage" signal in this schema (deliverable_version_kb_entries,
-- eks_request_vault_entries, sop_vault_entry_links/playbook_vault_entry_links),
-- which all answer "was this cited by other content," never "did a human
-- actually look at it." docs/TDD.md had explicitly left this specific
-- signal ("views/link-backs") unscheduled until now.
--
-- content_id is intentionally not a foreign key: it can point into any of
-- four different tables (knowledge_vault_entries/knowledge_scripts/sops/
-- playbooks) depending on content_type, the same polymorphic-reference
-- tradeoff usage_events already makes (there, via untyped jsonb metadata
-- instead of a typed column) rather than four nullable FK columns on one
-- analytics table. An orphaned row after a delete just stops matching any
-- entity in a join and is filtered out — no referential-integrity risk for
-- what is, at most, a "this doesn't count towards anything anymore" event.
create table public.content_views (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  content_type text not null check (content_type in ('vault_entry', 'script', 'sop', 'playbook')),
  content_id uuid not null,
  viewer_user_id uuid references public.users(id) on delete set null,
  viewer_email text not null,
  -- A plain column rather than an index expression over created_at::date —
  -- Postgres won't allow a functional index on a timestamptz cast to date
  -- (it depends on the session timezone, so isn't IMMUTABLE). Defaulted at
  -- insert time; the application never needs to set it explicitly.
  view_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index content_views_account_idx on public.content_views (account_id);
create index content_views_content_idx on public.content_views (content_type, content_id);

-- One row per viewer per piece of content per day: recording a view on
-- every page load should be idempotent, not a fresh row on every refresh.
-- A unique index (rather than a check-then-insert in application code)
-- makes that atomic under concurrent requests — the insert path catches
-- and swallows the resulting unique-violation.
create unique index content_views_dedup_idx
  on public.content_views (content_type, content_id, viewer_user_id, view_date);

alter table public.content_views enable row level security;

-- Append-only, account-scoped — same shape as eks_requests (migration
-- 0034): any authenticated member of the account can insert a view of
-- their own account's content and can see the account's own view history.
-- Unlike usage_events (admin-only select — that table aggregates
-- platform-wide billing-relevant signals), a firm's own team should be
-- able to see which of their own content is or isn't getting looked at —
-- that's the entire point of this table.
create policy "content_views_select"
  on public.content_views
  for select
  using (account_id = auth_account_id());

create policy "content_views_insert"
  on public.content_views
  for insert
  with check (account_id = auth_account_id());
