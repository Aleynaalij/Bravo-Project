import type { SupabaseClient } from "@supabase/supabase-js";
import { searchVault } from "@/lib/vault/search";
import { searchSops } from "@/lib/sop/search";
import { searchPlaybooks } from "@/lib/playbook/search";
import { searchProjects } from "@/lib/projects/search";
import { searchMicrosoftDocs, type MicrosoftDocResult } from "@/lib/search/microsoft-docs";
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
  // null means the live Microsoft Docs call itself failed/timed out (the
  // section should say "unavailable"), distinct from [] meaning the call
  // succeeded but found nothing (the section should say "no matches") —
  // same null-vs-empty-array distinction trySemanticSearchEntries/Scripts
  // already use in src/lib/vault/search.ts.
  microsoftDocs: MicrosoftDocResult[] | null;
}

// Unified ranked search across every content type this app can search —
// Historical Projects -> Playbooks -> Lessons Learned/Incidents -> Scripts
// -> SOPs -> Microsoft Docs (the original Module 10 brief's own ranking).
// The first five are this account's own real, internally-authored
// content and rank ahead of the sixth on purpose — the same "real
// knowledge outranks..." rationale searchVault's own doc comment
// documents, extended here to "this firm's own knowledge outranks a
// public external reference." Microsoft Docs is real and live (Microsoft's
// own MCP server, see microsoft-docs.ts), not fabricated, but it is the
// one section this session could never actually round-trip against the
// live endpoint (learn.microsoft.com is blocked from this sandbox) — see
// docs/validation-checklist.md for the verification gap this leaves.
export async function searchKnowledge(supabase: SupabaseClient, query: string): Promise<KnowledgeSearchResult> {
  const [historicalProjects, vaultResult, sops, playbooks, microsoftDocs] = await Promise.all([
    searchProjects(supabase, query),
    searchVault(supabase, query),
    searchSops(supabase, query),
    searchPlaybooks(supabase, query),
    searchMicrosoftDocs(query),
  ]);

  return {
    historicalProjects,
    playbooks,
    lessonsAndIncidents: vaultResult.entries,
    scripts: vaultResult.scripts,
    sops,
    microsoftDocs,
  };
}
