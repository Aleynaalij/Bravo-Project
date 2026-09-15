import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { KnowledgeBaseEntryRow } from "./types";

// Simple tag-filtered retrieval per TDD §2.5 — revisit with pgvector once
// the KB is large enough to need semantic search. Returns entries matching
// any of the given services, preferring industry-specific entries over
// generic ones for the same service (both are included when present, so
// generation always sees the general best-practice plus any
// industry-specific nuance).
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
export async function getRelevantKnowledgeBaseEntries(
  supabase: SupabaseClient,
  services: ServiceType[],
  industry: string,
): Promise<KnowledgeBaseEntryRow[]> {
  if (services.length === 0) return [];

  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select("id, title, service_type, industry, content, source_url")
    .in("service_type", services);

  if (error) throw error;
  return (data ?? []).filter((entry) => entry.industry === null || entry.industry === industry);
}
