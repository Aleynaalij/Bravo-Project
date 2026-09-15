-- Fixes the two items flagged by Supabase's own performance advisor
-- (BravoPilot Phase 1 remediation, per docs/validation-checklist.md):
--
-- 1. auth_rls_initplan: `knowledge_base_entries_select_authenticated` and
--    `prompt_templates_select_authenticated` call auth.role() directly,
--    which Postgres re-evaluates per row. Wrapping it as (select auth.role())
--    lets the planner evaluate it once per statement instead.
-- 2. unindexed_foreign_keys: three FK columns with no covering index.

drop policy if exists "knowledge_base_entries_select_authenticated" on public.knowledge_base_entries;
create policy "knowledge_base_entries_select_authenticated"
  on public.knowledge_base_entries
  for select
  using ((select auth.role()) = 'authenticated');

drop policy if exists "prompt_templates_select_authenticated" on public.prompt_templates;
create policy "prompt_templates_select_authenticated"
  on public.prompt_templates
  for select
  using ((select auth.role()) = 'authenticated');

create index if not exists deliverable_version_kb_entries_kb_entry_id_idx
  on public.deliverable_version_kb_entries (knowledge_base_entry_id);

create index if not exists deliverables_current_version_id_idx
  on public.deliverables (current_version_id);

create index if not exists generation_jobs_result_deliverable_id_idx
  on public.generation_jobs (result_deliverable_id);
