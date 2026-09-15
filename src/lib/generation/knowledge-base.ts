import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { generateEmbedding } from "@/lib/ai/provider";
import type { KnowledgeBaseEntryRow } from "./types";

const SEMANTIC_MATCH_COUNT = 8;

// Real semantic search (supabase/migrations/0022_kb_semantic_search.sql),
// layered on top of the tag filter below rather than replacing it:
// service_type/industry still gate the candidate set (an entry for a
// service that isn't in scope should never surface, however semantically
// similar it reads) — only within that set does embedding similarity rank
// results. Returns null, not an empty array, whenever it can't produce a
// real semantic result — distinct from "the search ran and found
// nothing" — so the caller knows to fall back to the tag-filtered
// behavior instead of returning zero KB context to a generation.
async function trySemanticSearch(
  supabase: SupabaseClient,
  services: ServiceType[],
  industry: string,
): Promise<KnowledgeBaseEntryRow[] | null> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(
      `Microsoft ${services.map((s) => SERVICE_LABELS[s]).join(", ")} guidance for the ${industry} industry`,
    );
  } catch {
    // No AI provider configured, or the embeddings call failed — the
    // fallback tag filter below covers this exactly as well as it always
    // has, so this isn't a hard failure for generation as a whole.
    return null;
  }

  const { data, error } = await supabase.rpc("match_knowledge_base_entries", {
    query_embedding: queryEmbedding,
    filter_service_types: services,
    filter_industry: industry,
    match_count: SEMANTIC_MATCH_COUNT,
  });
  if (error) throw error;
  // Empty isn't necessarily "no relevant content exists" — it's also what
  // an unembedded KB (nothing saved since 0022 shipped, or an AI provider
  // that only came online after these rows were created) looks like.
  // Falling back here means new/un-embedded content doesn't just vanish
  // from generation until someone happens to re-save it.
  if (!data || data.length === 0) return null;
  return data;
}

// Tag-filtered retrieval — this was the only retrieval strategy before
// this file grew semantic search above; kept as the fallback path
// trySemanticSearch defers to whenever a real semantic result isn't
// available, not just as a historical artifact.
//
// The industry filter is applied in application code, not as a Postgrest
// filter string, deliberately: `industry` is free text from the project
// intake form (no closed enum — "Other" is a legitimate value), and it
// previously reached `.or(\`industry.eq.${industry}\`)\` via raw template-
// literal interpolation, which is a filter-injection primitive (a value
// containing Postgrest filter syntax like a comma or parenthesis reaches
// the query unescaped). Per-service KB volume is small enough (a handful
// of rows) that fetching by service alone and filtering client-side has no
// meaningful cost, and it removes the injection vector entirely rather
// than trying to escape it correctly.
async function tagFilteredSearch(
  supabase: SupabaseClient,
  services: ServiceType[],
  industry: string,
): Promise<KnowledgeBaseEntryRow[]> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select("id, title, service_type, industry, content, source_url")
    .in("service_type", services);

  if (error) throw error;
  return (data ?? []).filter((entry) => entry.industry === null || entry.industry === industry);
}

export async function getRelevantKnowledgeBaseEntries(
  supabase: SupabaseClient,
  services: ServiceType[],
  industry: string,
): Promise<KnowledgeBaseEntryRow[]> {
  if (services.length === 0) return [];

  const semanticResults = await trySemanticSearch(supabase, services, industry);
  if (semanticResults) return semanticResults;

  return tagFilteredSearch(supabase, services, industry);
}
