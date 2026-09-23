-- Deliverable approval workflow — the "workflow engine" item this app's
-- roadmap tracked as not built at all. Today a deliverable's own `status`
-- column (migration 0001) only tracks the generation pipeline (pending ->
-- generating -> ready/failed); there's no concept of anyone having
-- reviewed or signed off on a *ready* deliverable before it goes to a
-- client — the export buttons work the instant generation finishes.
-- review_status is a second, independent lifecycle layered on top, same
-- "text + check constraint" convention migration 0031's project status
-- established rather than a Postgres enum type (0001's original
-- deliverable_status is the older style, not the one to keep following).
alter table public.deliverables
  add column review_status text not null default 'not_submitted'
    check (review_status in ('not_submitted', 'in_review', 'approved', 'changes_requested')),
  add column submitted_by uuid references public.users(id) on delete set null,
  add column submitted_by_email text,
  add column submitted_at timestamptz,
  add column reviewed_by uuid references public.users(id) on delete set null,
  add column reviewed_by_email text,
  add column reviewed_at timestamptz,
  add column review_note text;

-- No RLS change needed — deliverables_all_via_project (migration 0002)
-- already covers select/update for these new columns via the same
-- project/account scoping every other deliverables column uses.
