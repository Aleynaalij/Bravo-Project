import type { SupabaseClient } from "@supabase/supabase-js";
import { rankByTextMatch } from "@/lib/vault/search";
import { PLAYBOOK_COLUMNS, type PlaybookRow } from "./service";

// Text-filtered only, no semantic search — unlike sops (search.ts's
// trySemanticSearchSops), playbooks don't get an embedding column in this
// phase (see migration 0035's doc comment). Same fallback-only shape
// knowledge_base_entries had before semantic search landed there.
export async function searchPlaybooks(supabase: SupabaseClient, query: string): Promise<PlaybookRow[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.from("playbooks").select<string, PlaybookRow>(PLAYBOOK_COLUMNS);
  if (error) throw error;
  return rankByTextMatch(data ?? [], query, (playbook) =>
    [playbook.title, ...playbook.content.sections.flatMap((s) => s.paragraphs)].join(" "),
  );
}
