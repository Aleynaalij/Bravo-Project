-- Unified ranked search (EKS Phase 2, step 11/16): adds the
-- deferred-until-needed embedding column to sops (Module 2/3's own doc
-- comment flagged this as landing "when the feature that uses it lands" —
-- this is that step). Playbooks deliberately do NOT get a matching
-- embedding column in this phase — searchPlaybooks (src/lib/playbook/
-- search.ts) is text-filtered only for now, same fallback-only shape
-- knowledge_base_entries had before migration 0022 added semantic search
-- there; a match_playbooks RPC is a natural follow-up once this phase's
-- other modules are done, not required for the unified search page to
-- ship.
alter table public.sops add column embedding vector(1536);

-- Same HNSW-over-ivfflat reasoning as every other embedding column in
-- this schema (migrations 0022, 0027): no per-account table will have
-- enough rows for ivfflat's representative-data-at-build-time requirement
-- to hold, and HNSW doesn't need it.
create index sops_embedding_idx
  on public.sops
  using hnsw (embedding vector_cosine_ops);

-- security invoker (the default for a plain function, not security
-- definer) — runs as the calling user and inherits sops' own RLS
-- automatically, same rationale match_knowledge_vault_entries/
-- match_knowledge_scripts already document (migration 0027).
create or replace function public.match_sops(
  query_embedding vector(1536),
  match_count int default 8
)
returns setof public.sops
language sql
stable
set search_path = public, extensions
as $$
  select *
  from public.sops
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
