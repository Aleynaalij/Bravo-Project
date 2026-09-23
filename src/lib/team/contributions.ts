import type { SupabaseClient } from "@supabase/supabase-js";
import { listVaultEntries, type VaultEntryRow } from "@/lib/vault/entries-service";
import { listVaultScripts, type VaultScriptRow } from "@/lib/vault/scripts-service";
import { listSops, type SopRow } from "@/lib/sop/service";
import { listPlaybooks, type PlaybookRow } from "@/lib/playbook/service";
import { filterByAuthorId } from "@/lib/vault/search";
import { searchKnowledge } from "@/lib/search/knowledge";

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

export interface ConsultantContributionCount {
  authorEmail: string;
  count: number;
}

interface AuthorEmailRow {
  author_email: string;
}

// Pure aggregation — same real-counts, no-scoring shape as
// vault.ts's summarizeVaultMetrics. Groups by author_email (denormalized
// onto every one of these four tables specifically so an entry stays
// attributable after the author's own users row is gone, same rationale
// entries-service.ts documents) rather than author_user_id, so a departed
// teammate's past contributions still show up under their own name
// instead of disappearing into a "null" bucket.
export function summarizeContributionCounts(rows: AuthorEmailRow[]): ConsultantContributionCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.author_email, (counts.get(row.author_email) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([authorEmail, count]) => ({ authorEmail, count }))
    .sort((a, b) => b.count - a.count);
}

// Platform-metrics counterpart to getConsultantContributions above — that
// one answers "what has this one teammate done," this answers "who's
// contributing the most" for the Consultant dashboard tab's BarChart, by
// summing the same four content tables across every author at once
// instead of filtering to one.
export async function getAllConsultantContributionCounts(
  supabase: SupabaseClient,
): Promise<ConsultantContributionCount[]> {
  const [entries, scripts, sops, playbooks] = await Promise.all([
    listVaultEntries(supabase),
    listVaultScripts(supabase),
    listSops(supabase),
    listPlaybooks(supabase),
  ]);
  return summarizeContributionCounts([...entries, ...scripts, ...sops, ...playbooks]);
}

export interface ConsultantKnowledgeResult {
  playbooks: PlaybookRow[];
  lessonsAndIncidents: VaultEntryRow[];
  scripts: VaultScriptRow[];
  sops: SopRow[];
}

// The "personal-memory surfacing" half of Michael Mode — "what would
// [teammate] say about X?", not just "what has [teammate] captured."
// Reuses searchKnowledge() unchanged rather than a parallel scoped-search
// implementation: ranks account-wide first (so semantic search still sees
// the whole corpus, same as every other search entry point in this app),
// then filters each list down to this one author with the same generic
// filterByAuthorId already used by getConsultantContributions above.
// Historical Projects is left out on purpose — a project isn't something
// one person "says," it's a shared engagement record.
export async function searchConsultantKnowledge(
  supabase: SupabaseClient,
  authorUserId: string,
  query: string,
): Promise<ConsultantKnowledgeResult> {
  if (!query.trim()) return { playbooks: [], lessonsAndIncidents: [], scripts: [], sops: [] };

  const results = await searchKnowledge(supabase, query);
  return {
    playbooks: filterByAuthorId(results.playbooks, authorUserId, (row) => row.author_user_id),
    lessonsAndIncidents: filterByAuthorId(results.lessonsAndIncidents, authorUserId, (row) => row.author_user_id),
    scripts: filterByAuthorId(results.scripts, authorUserId, (row) => row.author_user_id),
    sops: filterByAuthorId(results.sops, authorUserId, (row) => row.author_user_id),
  };
}
