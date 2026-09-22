-- Project status/closure — the "no project should be closed without
-- knowledge capture" gate from the Expert Knowledge System brief. Projects
-- had no lifecycle concept at all until now (confirmed by reading every
-- migration touching this table); closing one is a new, deliberate action,
-- not a rename of something that already existed. A closed project is
-- read-only (see src/lib/generation/jobs.ts / generate-actions.ts) —
-- generating new deliverables against a "closed" engagement would read as
-- a state bug, not a valid action.
alter table public.projects
  add column status text not null default 'active' check (status in ('active', 'closed')),
  add column closed_at timestamptz;

-- No RLS change needed — the existing projects_all_own_account policy
-- (migration 0002) already covers select/update for these new columns.
