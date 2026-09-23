import type { SupabaseClient } from "@supabase/supabase-js";
import type { ViewableContentType } from "@/lib/usage/content-views";

export const CONTENT_TYPE_LABELS: Record<ViewableContentType, string> = {
  vault_entry: "Lesson/Incident",
  script: "Script",
  sop: "SOP",
  playbook: "Playbook",
};

export const CONTENT_TYPE_HREF_PREFIX: Record<ViewableContentType, string> = {
  vault_entry: "/dashboard/knowledge-vault",
  script: "/dashboard/knowledge-vault/scripts",
  sop: "/dashboard/sops",
  playbook: "/dashboard/playbooks",
};

export interface ContentSummaryRow {
  id: string;
  title: string;
  contentType: ViewableContentType;
}

interface ContentViewRow {
  content_type: ViewableContentType;
  content_id: string;
}

export interface ContentViewMetrics {
  // Top 10 across all four content types by distinct viewer-days (each
  // content_views row is already deduped to one per viewer per day, so a
  // count here means "opened on N distinct viewer-days," not raw page
  // hits inflated by refreshes).
  mostViewed: (ContentSummaryRow & { viewCount: number })[];
  // Everything with zero rows in content_views — the counterpart to
  // usage.ts's unusedKbEntries, but for actual opens rather than
  // citation-in-a-deliverable.
  neverViewed: ContentSummaryRow[];
}

function contentKey(contentType: ViewableContentType, id: string): string {
  return `${contentType}:${id}`;
}

// Pure — no I/O, no account scoping of its own (the caller's RLS-scoped
// client already limited both inputs to one account, same convention as
// summarizeCrossReferences in knowledge.ts).
export function summarizeContentViews(viewRows: ContentViewRow[], allContent: ContentSummaryRow[]): ContentViewMetrics {
  const counts = new Map<string, number>();
  for (const row of viewRows) {
    const key = contentKey(row.content_type, row.content_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const mostViewed = allContent
    .map((entry) => ({ ...entry, viewCount: counts.get(contentKey(entry.contentType, entry.id)) ?? 0 }))
    .filter((entry) => entry.viewCount > 0)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  const neverViewed = allContent.filter((entry) => !counts.has(contentKey(entry.contentType, entry.id)));

  return { mostViewed, neverViewed };
}

// Account-scoped entirely by RLS (content_views, knowledge_vault_entries,
// knowledge_scripts, sops, playbooks all key off auth_account_id()) — same
// "the caller's client decides the scope" convention as getKnowledgeMetrics.
export async function getContentViewMetrics(supabase: SupabaseClient): Promise<ContentViewMetrics> {
  const [viewsResult, vaultResult, scriptsResult, sopsResult, playbooksResult] = await Promise.all([
    supabase.from("content_views").select("content_type, content_id"),
    supabase.from("knowledge_vault_entries").select("id, title"),
    supabase.from("knowledge_scripts").select("id, name"),
    supabase.from("sops").select("id, title"),
    supabase.from("playbooks").select("id, title"),
  ]);
  if (viewsResult.error) throw viewsResult.error;
  if (vaultResult.error) throw vaultResult.error;
  if (scriptsResult.error) throw scriptsResult.error;
  if (sopsResult.error) throw sopsResult.error;
  if (playbooksResult.error) throw playbooksResult.error;

  const allContent: ContentSummaryRow[] = [
    ...(vaultResult.data ?? []).map((e) => ({ id: e.id, title: e.title, contentType: "vault_entry" as const })),
    ...(scriptsResult.data ?? []).map((e) => ({ id: e.id, title: e.name, contentType: "script" as const })),
    ...(sopsResult.data ?? []).map((e) => ({ id: e.id, title: e.title, contentType: "sop" as const })),
    ...(playbooksResult.data ?? []).map((e) => ({ id: e.id, title: e.title, contentType: "playbook" as const })),
  ];

  return summarizeContentViews(viewsResult.data ?? [], allContent);
}
