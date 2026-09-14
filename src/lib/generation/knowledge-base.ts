import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { KnowledgeBaseEntryRow } from "./types";

// Simple tag-filtered retrieval per TDD §2.5 — revisit with pgvector once
// the KB is large enough to need semantic search. Returns entries matching
// any of the given services, preferring industry-specific entries over
// generic ones for the same service (both are included when present, so
// generation always sees the general best-practice plus any
// industry-specific nuance).
export async function getRelevantKnowledgeBaseEntries(
  supabase: SupabaseClient,
  services: ServiceType[],
  industry: string,
): Promise<KnowledgeBaseEntryRow[]> {
  if (services.length === 0) return [];

  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select("id, title, service_type, industry, content, source_url")
    .in("service_type", services)
    .or(`industry.is.null,industry.eq.${industry}`);

  if (error) throw error;
  return data ?? [];
}
