import type { SupabaseClient } from "@supabase/supabase-js";
import { listVaultEntries, type VaultEntryRow } from "@/lib/vault/entries-service";
import { listVaultScripts, type VaultScriptRow } from "@/lib/vault/scripts-service";
import { listSops, type SopRow } from "@/lib/sop/service";
import { listPlaybooks, type PlaybookRow } from "@/lib/playbook/service";
import { filterByAuthorId } from "@/lib/vault/search";

export interface ConsultantContributions {
  vaultEntries: VaultEntryRow[];
  scripts: VaultScriptRow[];
  sops: SopRow[];
  playbooks: PlaybookRow[];
  // eks_requests has no "list everything, filter locally" precedent to
  // reuse (unlike the four content tables above) — it's an append-only
  // log, not browsable content, so a direct filtered count is the right
  // shape here, not a list of rows to render.
  eksRequestCount: number;
}

// "What would [teammate] do?" (Michael Mode), upgraded from a same-page
// filter into a dedicated per-consultant view — fetches every content
// type this account's teammates can author and reuses the existing,
// already-generic filterByAuthorId (src/lib/vault/search.ts) for each,
// rather than adding a fifth bespoke filter implementation.
export async function getConsultantContributions(
  supabase: SupabaseClient,
  authorUserId: string,
): Promise<ConsultantContributions> {
  const [rawEntries, rawScripts, rawSops, rawPlaybooks, eksCountResult] = await Promise.all([
    listVaultEntries(supabase),
    listVaultScripts(supabase),
    listSops(supabase),
    listPlaybooks(supabase),
    supabase.from("eks_requests").select("id", { count: "exact", head: true }).eq("user_id", authorUserId),
  ]);

  if (eksCountResult.error) throw eksCountResult.error;

  return {
    vaultEntries: filterByAuthorId(rawEntries, authorUserId, (row) => row.author_user_id),
    scripts: filterByAuthorId(rawScripts, authorUserId, (row) => row.author_user_id),
    sops: filterByAuthorId(rawSops, authorUserId, (row) => row.author_user_id),
    playbooks: filterByAuthorId(rawPlaybooks, authorUserId, (row) => row.author_user_id),
    eksRequestCount: eksCountResult.count ?? 0,
  };
}
