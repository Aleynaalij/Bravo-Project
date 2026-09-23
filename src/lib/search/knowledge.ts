import type { SupabaseClient } from "@supabase/supabase-js";
import { searchVault } from "@/lib/vault/search";
import { searchSops } from "@/lib/sop/search";
import { searchPlaybooks } from "@/lib/playbook/search";
import { searchProjects } from "@/lib/projects/search";
import type { VaultEntryRow } from "@/lib/vault/entries-service";
import type { VaultScriptRow } from "@/lib/vault/scripts-service";
import type { SopRow } from "@/lib/sop/service";
import type { PlaybookRow } from "@/lib/playbook/service";
import type { ProjectWithServices } from "@/lib/projects/service";

export interface KnowledgeSearchResult {
  historicalProjects: ProjectWithServices[];
  playbooks: PlaybookRow[];
  lessonsAndIncidents: VaultEntryRow[];
  scripts: VaultScriptRow[];
  sops: SopRow[];
}

// Unified ranked search across every account-authored content type —
// Historical Projects -> Playbooks -> Lessons Learned/Incidents -> Scripts
// -> SOPs (the original Module 10 brief's own ranking; Confirmed Decision 8
// of the EKS V2 plan deferred Historical Projects, since it hadn't been
// built yet — now that it has, it resumes its original first slot ahead of
// Playbooks). Five separate ranked lists, never blended into one
// relevance-sorted feed — same "real knowledge outranks..." rationale
// searchVault's own doc comment already documents. Microsoft Docs remains
// out of this list: it would need a real live-fetch integration this app
// doesn't have, and fabricating one with nothing behind it is exactly what
// this app's docs (TDD.md) already warn against for every other feature.
export async function searchKnowledge(supabase: SupabaseClient, query: string): Promise<KnowledgeSearchResult> {
  const [historicalProjects, vaultResult, sops, playbooks] = await Promise.all([
    searchProjects(supabase, query),
    searchVault(supabase, query),
    searchSops(supabase, query),
    searchPlaybooks(supabase, query),
  ]);

  return {
    historicalProjects,
    playbooks,
    lessonsAndIncidents: vaultResult.entries,
    scripts: vaultResult.scripts,
    sops,
  };
}
