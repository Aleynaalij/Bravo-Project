import type { SupabaseClient } from "@supabase/supabase-js";

export interface KnowledgeMetrics {
  newSopsThisPeriod: number;
  newPlaybooksThisPeriod: number;
  mostCrossReferencedEntries: { id: string; title: string; referenceCount: number }[];
}

// 30 days — no brief-stated period for "this period," so this picks the
// same "recent activity" window the rest of this app defaults to
// elsewhere (e.g. the recent-activity dashboard widget); a judgment call,
// not a certified figure, same framing this app's other heuristics
// document about themselves.
export const KNOWLEDGE_PERIOD_DAYS = 30;

interface CrossReferenceRow {
  knowledge_vault_entries: { id: string; title: string } | { id: string; title: string }[] | null;
}

// Pure aggregation over already-fetched join rows from three tables —
// eks_request_vault_entries (searchVault's automatic "similar historical
// issues" surfacing for a troubleshoot request) plus the two curated
// sop_vault_entry_links/playbook_vault_entry_links tables (migration
// 0036) — merged into one ranked list, since all three answer the same
// question: which vault entries has other content actually pointed back
// at. Same embedded-resource normalization as usage.ts's kbCounts
// (PostgREST can return either a single object or an array for a
// many-to-one embed, and this project's hand-written types don't capture
// that).
export function summarizeCrossReferences(
  rows: CrossReferenceRow[],
): { id: string; title: string; referenceCount: number }[] {
  const counts = new Map<string, { title: string; referenceCount: number }>();
  for (const row of rows) {
    const related = row.knowledge_vault_entries;
    const entry = Array.isArray(related) ? related[0] : related;
    if (!entry) continue;
    const existing = counts.get(entry.id) ?? { title: entry.title, referenceCount: 0 };
    existing.referenceCount += 1;
    counts.set(entry.id, existing);
  }
  return Array.from(counts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.referenceCount - a.referenceCount)
    .slice(0, 10);
}

// Account-scoped by RLS (sops/playbooks/*_vault_entry_links all key off
// auth_account_id() through their own or a parent row) — the caller must
// pass a session client, not the admin client, same isolation this
// content's own tables already enforce everywhere else.
export async function getKnowledgeMetrics(supabase: SupabaseClient): Promise<KnowledgeMetrics> {
  const periodStart = new Date(Date.now() - KNOWLEDGE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [sopsResult, playbooksResult, eksLinksResult, sopLinksResult, playbookLinksResult] = await Promise.all([
    supabase.from("sops").select("id", { count: "exact", head: true }).gte("created_at", periodStart),
    supabase.from("playbooks").select("id", { count: "exact", head: true }).gte("created_at", periodStart),
    supabase.from("eks_request_vault_entries").select("knowledge_vault_entries(id, title)"),
    supabase.from("sop_vault_entry_links").select("knowledge_vault_entries(id, title)"),
    supabase.from("playbook_vault_entry_links").select("knowledge_vault_entries(id, title)"),
  ]);
  if (sopsResult.error) throw sopsResult.error;
  if (playbooksResult.error) throw playbooksResult.error;
  if (eksLinksResult.error) throw eksLinksResult.error;
  if (sopLinksResult.error) throw sopLinksResult.error;
  if (playbookLinksResult.error) throw playbookLinksResult.error;

  const crossReferenceRows: CrossReferenceRow[] = [
    ...(eksLinksResult.data ?? []),
    ...(sopLinksResult.data ?? []),
    ...(playbookLinksResult.data ?? []),
  ];

  return {
    newSopsThisPeriod: sopsResult.count ?? 0,
    newPlaybooksThisPeriod: playbooksResult.count ?? 0,
    mostCrossReferencedEntries: summarizeCrossReferences(crossReferenceRows),
  };
}
