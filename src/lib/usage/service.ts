import type { SupabaseClient } from "@supabase/supabase-js";

// Kept to a closed set rather than a free-text string — see
// docs/validation-checklist.md's usage-analytics entry for why this is
// the one genuinely new signal this project collects, versus everything
// else on the admin Metrics page (src/app/admin/metrics), which is
// aggregated directly from data already tracked elsewhere
// (generation_jobs, deliverable_versions.source, project_services,
// deliverable_version_kb_entries) rather than re-logged here.
export type UsageEventType = "deliverable.exported";

export interface LogUsageEventInput {
  accountId: string;
  eventType: UsageEventType;
  metadata?: Record<string, unknown>;
}

// Best-effort, not blocking: logging a metric should never be the reason
// a real user-facing action (here, an export download) fails. Same
// judgment call as Stripe seat-quantity sync in
// src/app/dashboard/settings/actions.ts.
export async function logUsageEvent(
  supabase: SupabaseClient,
  input: LogUsageEventInput,
): Promise<void> {
  try {
    await supabase.from("usage_events").insert({
      account_id: input.accountId,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Swallowed deliberately — see comment above.
  }
}
