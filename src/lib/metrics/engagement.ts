import type { SupabaseClient } from "@supabase/supabase-js";

export const ENGAGEMENT_HEALTH_VALUES = ["healthy", "review_needed", "stalled"] as const;
export type EngagementHealth = (typeof ENGAGEMENT_HEALTH_VALUES)[number];

export const ENGAGEMENT_HEALTH_LABELS: Record<EngagementHealth, string> = {
  healthy: "Healthy",
  review_needed: "Review needed",
  stalled: "Stalled",
};

const STALE_PROJECT_DAYS = 7;

function daysSince(isoDate: string, now: Date): number {
  return (now.getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

// A documented heuristic over data this app already has (deliverable
// status + project age), not a black box and not a fabricated score:
//   - no deliverables started, and the project is more than a week old
//     → stalled (an intake nobody followed up on)
//   - no deliverables started yet, but the project is recent → review
//     needed (not stalled, just not started)
//   - at least one failed generation and nothing ready yet → stalled
//     (every attempt so far has failed)
//   - at least one failed generation but something else is ready →
//     review needed (partial failure, not a dead project)
//   - nothing failed, but nothing is ready yet (still queued/generating)
//     → review needed
//   - otherwise (something ready, nothing failed) → healthy
// Exported and pure so it's unit-testable without a database, same
// pattern as headingsMatchRequiredSections / getApplicableSections.
export function computeEngagementHealth(
  deliverableStatuses: string[],
  projectCreatedAt: string,
  now: Date = new Date(),
): EngagementHealth {
  if (deliverableStatuses.length === 0) {
    return daysSince(projectCreatedAt, now) > STALE_PROJECT_DAYS ? "stalled" : "review_needed";
  }

  const failed = deliverableStatuses.filter((s) => s === "failed").length;
  const ready = deliverableStatuses.filter((s) => s === "ready").length;

  if (failed > 0 && ready === 0) return "stalled";
  if (failed > 0) return "review_needed";
  if (ready === 0) return "review_needed";
  return "healthy";
}

export interface EngagementHealthSummary {
  byProject: Record<string, EngagementHealth>;
  counts: Record<EngagementHealth, number>;
}

// Reads via the caller's own client — RLS already scopes `projects` and
// `deliverables` to the caller's account (supabase/migrations/0002_rls.sql),
// so this needs no account_id filtering of its own, same pattern as
// src/lib/metrics/usage.ts.
export async function getEngagementHealthSummary(
  supabase: SupabaseClient,
): Promise<EngagementHealthSummary> {
  const [projectsResult, deliverablesResult] = await Promise.all([
    supabase.from("projects").select("id, created_at"),
    supabase.from("deliverables").select("project_id, status"),
  ]);
  if (projectsResult.error) throw projectsResult.error;
  if (deliverablesResult.error) throw deliverablesResult.error;

  const statusesByProject = new Map<string, string[]>();
  for (const row of deliverablesResult.data ?? []) {
    const list = statusesByProject.get(row.project_id) ?? [];
    list.push(row.status);
    statusesByProject.set(row.project_id, list);
  }

  const byProject: Record<string, EngagementHealth> = {};
  const counts: Record<EngagementHealth, number> = { healthy: 0, review_needed: 0, stalled: 0 };

  for (const project of projectsResult.data ?? []) {
    const health = computeEngagementHealth(statusesByProject.get(project.id) ?? [], project.created_at);
    byProject[project.id] = health;
    counts[health] += 1;
  }

  return { byProject, counts };
}
