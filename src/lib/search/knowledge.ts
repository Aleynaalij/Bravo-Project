import type { SupabaseClient } from "@supabase/supabase-js";
import { searchVault } from "@/lib/vault/search";
import { searchSops } from "@/lib/sop/search";
import { searchPlaybooks } from "@/lib/playbook/search";
import type { VaultEntryRow } from "@/lib/vault/entries-service";
import type { VaultScriptRow } from "@/lib/vault/scripts-service";
import type { SopRow } from "@/lib/sop/service";
import type { PlaybookRow } from "@/lib/playbook/service";

export interface KnowledgeSearchResult {
  playbooks: PlaybookRow[];
  lessonsAndIncidents: VaultEntryRow[];
  scripts: VaultScriptRow[];
  sops: SopRow[];
}

// Unified ranked search across every account-authored content type this
// phase has added — Playbooks -> Lessons Learned/Incidents -> Scripts ->
// SOPs (Confirmed Decision 8 of the EKS V2 plan). Four separate ranked
// lists, never blended into one relevance-sorted feed — same "real
// knowledge outranks..." rationale searchVault's own doc comment already
// documents, just extended to the two content types this phase added.
export async function searchKnowledge(supabase: SupabaseClient, query: string): Promise<KnowledgeSearchResult> {
  const [vaultResult, sops, playbooks] = await Promise.all([
    searchVault(supabase, query),
    searchSops(supabase, query),
    searchPlaybooks(supabase, query),
  ]);

  return {
    playbooks,
    lessonsAndIncidents: vaultResult.entries,
    scripts: vaultResult.scripts,
    sops,
  };
}
