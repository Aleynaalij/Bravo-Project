import type { SupabaseClient } from "@supabase/supabase-js";

// The "did a human actually open this" signal docs/TDD.md had explicitly
// left unscheduled — distinct from every existing "usage" table in this
// schema (deliverable_version_kb_entries, eks_request_vault_entries,
// sop_vault_entry_links/playbook_vault_entry_links), which all answer "was
// this cited by other content," never "did anyone look at it."
export type ViewableContentType = "vault_entry" | "script" | "sop" | "playbook";

export interface RecordContentViewInput {
  accountId: string;
  contentType: ViewableContentType;
  contentId: string;
  viewerUserId: string;
  viewerEmail: string;
}

// Best-effort and idempotent per viewer per day, same judgment call as
// logUsageEvent (src/lib/usage/service.ts): recording a view should never
// be the reason a page fails to render, and calling this unconditionally
// on every page load must not inflate the count on every refresh. The
// content_views_dedup_idx unique index (migration 0046) enforces the
// once-per-viewer-per-day rule atomically; a violation here just means
// "already recorded today" and is swallowed like any other failure.
export async function recordContentView(supabase: SupabaseClient, input: RecordContentViewInput): Promise<void> {
  try {
    await supabase.from("content_views").insert({
      account_id: input.accountId,
      content_type: input.contentType,
      content_id: input.contentId,
      viewer_user_id: input.viewerUserId,
      viewer_email: input.viewerEmail,
    });
  } catch {
    // Swallowed deliberately — see comment above.
  }
}

// A display nicety ("Viewed N times" on the entry's own page), not a
// metric the app depends on for a decision — so like recordContentView,
// a failure here degrades to 0 rather than breaking the page.
export async function getContentViewCount(
  supabase: SupabaseClient,
  contentType: ViewableContentType,
  contentId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("content_views")
    .select("id", { count: "exact", head: true })
    .eq("content_type", contentType)
    .eq("content_id", contentId);
  if (error) return 0;
  return count ?? 0;
}
