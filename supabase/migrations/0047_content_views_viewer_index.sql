-- Follow-up to migration 0046 — the Supabase performance advisor flagged
-- content_views.viewer_user_id as an unindexed FK immediately after that
-- migration landed, same as migration 0045 did for deliverables' review
-- columns. Matches this schema's established convention of indexing every
-- author/actor-id-style FK.
create index content_views_viewer_user_id_idx
  on public.content_views (viewer_user_id);
