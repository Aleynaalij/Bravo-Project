import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableType, ServiceType } from "@/lib/domain/enums";
import { PRACTICE_AREA_LABELS, SERVICE_PRACTICE_AREA, type PracticeArea } from "@/lib/domain/labels";

// Does no auth/scoping of its own — every table it reads (generation_jobs,
// deliverable_versions, project_services, deliverable_version_kb_entries,
// usage_events) already has RLS restricting rows to the caller's own
// account (supabase/migrations/0002_rls.sql, 0023_usage_events.sql), so
// this function's result is scoped entirely by which client it's handed.
// src/app/dashboard/metrics/page.tsx passes a regular session client —
// RLS restricts every query to that user's own account, so the queries
// become that one account's own dashboard, with zero extra account_id
// filtering needed here. (The admin-only cross-account variant of this
// page, which passed the service-role client, was removed.)
//
// Aggregation happens in application code, not a SQL function — the
// project's data volume is genuinely small (an MVP with no real paying
// customers processing this yet) and every query below is a single
// (RLS-filtered) table scan, so the extra migration/review surface of a
// set of Postgres aggregate functions isn't worth it at this scale.
// Revisit if a table here ever gets large enough for that assumption to
// stop holding.
export interface UsageMetrics {
  generationsByType: {
    deliverableType: DeliverableType;
    succeeded: number;
    failed: number;
    other: number;
  }[];
  totalGenerations: number;
  servicesBySelection: { serviceType: ServiceType; count: number }[];
  editRate: { totalDeliverables: number; editedDeliverables: number };
  topKbEntries: { id: string; title: string; useCount: number }[];
  // Entries with zero references anywhere in this result set. Meaningful
  // platform-wide (the admin page) since the knowledge base is a shared,
  // platform-managed resource — on the per-account Dashboards page this
  // would mostly just reflect one account's narrow service scope, not an
  // actual content gap, so the caller decides whether to show it.
  unusedKbEntries: { id: string; title: string }[];
  exportsByFormat: { format: string; count: number }[];
  totalExports: number;
}

// Pure derived grouping over servicesBySelection — no new query, same
// data this project already groups by practice area in the generate
// form and intake checklist (labels.ts's SERVICE_PRACTICE_AREA). The
// brainstorm's "Microsoft Workload Trends" dashboard, in other words,
// is this exact number reshaped, not a new signal.
export function groupServicesByPracticeArea(
  servicesBySelection: UsageMetrics["servicesBySelection"],
): { practiceArea: PracticeArea; label: string; count: number }[] {
  const counts = new Map<PracticeArea, number>();
  for (const row of servicesBySelection) {
    const area = SERVICE_PRACTICE_AREA[row.serviceType];
    counts.set(area, (counts.get(area) ?? 0) + row.count);
  }
  return Array.from(counts.entries())
    .map(([practiceArea, count]) => ({ practiceArea, label: PRACTICE_AREA_LABELS[practiceArea], count }))
    .sort((a, b) => b.count - a.count);
}

export async function getUsageMetrics(admin: SupabaseClient): Promise<UsageMetrics> {
  const [jobsResult, servicesResult, versionsResult, kbUsageResult, allKbEntriesResult, exportsResult] =
    await Promise.all([
      admin.from("generation_jobs").select("deliverable_type, status"),
      admin.from("project_services").select("service_type"),
      admin.from("deliverable_versions").select("deliverable_id, source"),
      admin
        .from("deliverable_version_kb_entries")
        .select("knowledge_base_entry_id, knowledge_base_entries(id, title)"),
      admin.from("knowledge_base_entries").select("id, title"),
      admin
        .from("usage_events")
        .select("metadata")
        .eq("event_type", "deliverable.exported"),
    ]);

  if (jobsResult.error) throw jobsResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (versionsResult.error) throw versionsResult.error;
  if (kbUsageResult.error) throw kbUsageResult.error;
  if (allKbEntriesResult.error) throw allKbEntriesResult.error;
  if (exportsResult.error) throw exportsResult.error;

  const jobs = jobsResult.data ?? [];
  const byType = new Map<DeliverableType, { succeeded: number; failed: number; other: number }>();
  for (const job of jobs) {
    const entry = byType.get(job.deliverable_type) ?? { succeeded: 0, failed: 0, other: 0 };
    if (job.status === "succeeded") entry.succeeded += 1;
    else if (job.status === "failed") entry.failed += 1;
    else entry.other += 1;
    byType.set(job.deliverable_type, entry);
  }
  const generationsByType = Array.from(byType.entries())
    .map(([deliverableType, counts]) => ({ deliverableType, ...counts }))
    .sort((a, b) => b.succeeded + b.failed + b.other - (a.succeeded + a.failed + a.other));

  const services = servicesResult.data ?? [];
  const serviceCounts = new Map<ServiceType, number>();
  for (const row of services) {
    serviceCounts.set(row.service_type, (serviceCounts.get(row.service_type) ?? 0) + 1);
  }
  const servicesBySelection = Array.from(serviceCounts.entries())
    .map(([serviceType, count]) => ({ serviceType, count }))
    .sort((a, b) => b.count - a.count);

  const versions = versionsResult.data ?? [];
  const allDeliverableIds = new Set(versions.map((v) => v.deliverable_id));
  const editedDeliverableIds = new Set(
    versions.filter((v) => v.source === "consultant_edited").map((v) => v.deliverable_id),
  );

  const kbUsage = kbUsageResult.data ?? [];
  const kbCounts = new Map<string, { title: string; useCount: number }>();
  for (const row of kbUsage) {
    // PostgREST's embedded-resource shape for this join isn't reflected in
    // this project's (hand-written, not generated) Supabase types, so it
    // comes back typed more strictly than the actual runtime value —
    // normalize both the single-object and array shapes PostgREST can
    // return for a many-to-one embed rather than asserting one blindly.
    const related = row.knowledge_base_entries as unknown as
      | { id: string; title: string }
      | { id: string; title: string }[]
      | null;
    const entry = Array.isArray(related) ? related[0] : related;
    if (!entry) continue;
    const existing = kbCounts.get(entry.id) ?? { title: entry.title, useCount: 0 };
    existing.useCount += 1;
    kbCounts.set(entry.id, existing);
  }
  const topKbEntries = Array.from(kbCounts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 10);

  const unusedKbEntries = (allKbEntriesResult.data ?? [])
    .filter((entry) => !kbCounts.has(entry.id))
    .map((entry) => ({ id: entry.id, title: entry.title }));

  const exports = exportsResult.data ?? [];
  const formatCounts = new Map<string, number>();
  for (const row of exports) {
    const format = (row.metadata as { format?: string } | null)?.format ?? "unknown";
    formatCounts.set(format, (formatCounts.get(format) ?? 0) + 1);
  }
  const exportsByFormat = Array.from(formatCounts.entries())
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  return {
    generationsByType,
    totalGenerations: jobs.length,
    servicesBySelection,
    editRate: { totalDeliverables: allDeliverableIds.size, editedDeliverables: editedDeliverableIds.size },
    topKbEntries,
    unusedKbEntries,
    exportsByFormat,
    totalExports: exports.length,
  };
}
