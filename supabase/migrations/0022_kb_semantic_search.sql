-- Semantic (vector) knowledge-base retrieval (audit's Future Improvements
-- tier: "semantic (vector) knowledge-base retrieval once content volume
-- justifies it"). Was previously an honest, documented "tag-filtered
-- query, not real RAG yet" (src/lib/generation/knowledge-base.ts) — this
-- adds the real thing as an enhancement layered on top of, not instead
-- of, that tag filter: service_type and industry still gate which rows
-- are even candidates (an entry for a service that isn't in scope should
-- never surface regardless of how semantically similar it reads), and
-- only within that candidate set does embedding similarity pick the most
-- relevant ones.
-- Installed straight into `extensions`, not `public` — Supabase's own
-- advisor flags any extension left in public (its other extensions,
-- pgcrypto/uuid-ossp/pg_stat_statements, already live in `extensions` for
-- the same reason). Caught this the hard way too: the first version of
-- this migration created it in public, moved it after the advisor flagged
-- it, and that move broke match_knowledge_base_entries below (the `<=>`
-- operator lives with the extension, so a function whose search_path
-- doesn't include `extensions` can't resolve it) — both are fixed here
-- from the start rather than left as a two-step migration.
create extension if not exists vector with schema extensions;

-- 1536 dimensions matches text-embedding-3-small (src/lib/ai/provider.ts's
-- generateEmbedding) — this column's dimension has to change if the
-- embedding model ever does. Nullable: existing entries (and any new one
-- saved before an AI provider is configured) simply aren't semantically
-- searchable yet — see match_knowledge_base_entries' `embedding is not
-- null` filter and the application-side fallback in knowledge-base.ts for
-- how that's handled without those rows just disappearing.
alter table public.knowledge_base_entries
  add column embedding vector(1536);

-- HNSW over ivfflat: better recall/query performance without needing to
-- tune a `lists` parameter to table size, and unlike ivfflat it doesn't
-- need representative data present at index-build time — this project's
-- KB is exactly the "not much data yet" case ivfflat handles poorly.
create index knowledge_base_entries_embedding_idx
  on public.knowledge_base_entries
  using hnsw (embedding vector_cosine_ops);

-- One prepared statement rather than assembling a filter in application
-- code — industry and service_type are passed as genuine bound function
-- parameters (not string-interpolated into a query), the same
-- injection-safe property SEC-01's fix already established for the
-- existing tag-filter path, here for free from how Postgres function
-- calls work rather than needing the app-side workaround that fix used.
create or replace function public.match_knowledge_base_entries(
  query_embedding vector(1536),
  filter_service_types public.service_type[],
  filter_industry text,
  match_count int default 8
)
returns setof public.knowledge_base_entries
language sql
stable
set search_path = public, extensions
as $$
  select *
  from public.knowledge_base_entries
  where service_type = any(filter_service_types)
    and (industry is null or industry = filter_industry)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Unlike claim_generation_jobs (migration 0021), this one is deliberately
-- left at Supabase's default grants (anon/authenticated/service_role) —
-- it's read-only, and every authenticated user can already read every row
-- it touches via knowledge_base_entries_select_authenticated. There's no
-- privilege this function grants that RLS doesn't already.
