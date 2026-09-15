import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { KnowledgeBaseEntryInput } from "@/lib/validation/knowledge-base";
import { generateEmbedding } from "@/lib/ai/provider";

export interface KnowledgeBaseEntryRow {
  id: string;
  title: string;
  service_type: ServiceType;
  industry: string | null;
  content: string;
  source_url: string | null;
  version: number;
  created_at: string;
}

// Excludes `embedding` explicitly (a 1536-float array, supabase/migrations/
// 0022_kb_semantic_search.sql) — nothing that reads a KnowledgeBaseEntryRow
// needs the raw vector, and pulling it into every admin list/get response
// would be pure payload bloat.
const ENTRY_COLUMNS = "id, title, service_type, industry, content, source_url, version, created_at";

export async function listKnowledgeBaseEntries(
  supabase: SupabaseClient,
): Promise<KnowledgeBaseEntryRow[]> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select(ENTRY_COLUMNS)
    .order("service_type")
    .order("industry", { nullsFirst: true });
  if (error) throw error;
  return data ?? [];
}

export async function getKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<KnowledgeBaseEntryRow | null> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select(ENTRY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Best-effort, not blocking: an entry still saves correctly with no
// embedding if no AI provider is configured, or the embeddings call fails
// for any reason — it just isn't semantically searchable yet (falls back
// to the original tag-filter behavior, see
// src/lib/generation/knowledge-base.ts) until a future save succeeds.
async function tryGenerateEmbedding(input: KnowledgeBaseEntryInput): Promise<number[] | null> {
  try {
    return await generateEmbedding(`${input.title}\n\n${input.content}`);
  } catch {
    return null;
  }
}

export async function createKnowledgeBaseEntry(
  supabase: SupabaseClient,
  input: KnowledgeBaseEntryInput,
): Promise<KnowledgeBaseEntryRow> {
  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .insert({
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      content: input.content,
      source_url: input.sourceUrl,
      embedding,
    })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
  input: KnowledgeBaseEntryInput,
): Promise<KnowledgeBaseEntryRow> {
  const { data: existing } = await supabase
    .from("knowledge_base_entries")
    .select("version")
    .eq("id", id)
    .single();

  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .update({
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      content: input.content,
      source_url: input.sourceUrl,
      version: (existing?.version ?? 1) + 1,
      // Content changed — the old embedding (if any) no longer describes
      // this entry. Only overwrite with a new one if generation actually
      // succeeded; a failed regeneration should leave whatever embedding
      // already existed alone rather than null it out and regress a
      // previously-searchable entry back to tag-filter-only.
      ...(embedding ? { embedding } : {}),
    })
    .eq("id", id)
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("knowledge_base_entries").delete().eq("id", id);
  if (error) throw error;
}
