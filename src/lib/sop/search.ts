import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/ai/provider";
import { rankByTextMatch } from "@/lib/vault/search";
import { SOP_COLUMNS, type SopRow } from "./service";

const SEMANTIC_MATCH_COUNT = 8;

// Returns null (not an empty array) whenever it can't produce a real
// semantic result — same contract as vault/search.ts's
// trySemanticSearchEntries — so the caller knows to fall back to text
// matching instead of treating "no AI provider configured" as "this
// account has no SOPs."
async function trySemanticSearchSops(supabase: SupabaseClient, query: string): Promise<SopRow[] | null> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    return null;
  }

  const { data, error } = await supabase.rpc("match_sops", {
    query_embedding: queryEmbedding,
    match_count: SEMANTIC_MATCH_COUNT,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data as SopRow[];
}

async function textFilteredSearchSops(supabase: SupabaseClient, query: string): Promise<SopRow[]> {
  const { data, error } = await supabase.from("sops").select<string, SopRow>(SOP_COLUMNS);
  if (error) throw error;
  return rankByTextMatch(data ?? [], query, (sop) => [sop.title, ...sop.content.sections.flatMap((s) => s.paragraphs)].join(" "));
}

export async function searchSops(supabase: SupabaseClient, query: string): Promise<SopRow[]> {
  if (!query.trim()) return [];
  const semantic = await trySemanticSearchSops(supabase, query);
  return semantic ?? textFilteredSearchSops(supabase, query);
}
