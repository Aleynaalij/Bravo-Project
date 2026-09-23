-- Covering indexes for the two new FKs from migration 0044 — same
-- convention every other author_user_id-style FK in this schema already
-- follows (knowledge_vault_entries, sops, playbooks, coding_standards),
-- flagged by the Supabase performance advisor immediately after 0044.
create index deliverables_submitted_by_idx on public.deliverables (submitted_by);
create index deliverables_reviewed_by_idx on public.deliverables (reviewed_by);
