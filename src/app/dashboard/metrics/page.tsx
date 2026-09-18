import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsageMetrics } from "@/lib/metrics/usage";
import { getEngagementHealthSummary } from "@/lib/metrics/engagement";
import { getEditSeverityBreakdown } from "@/lib/metrics/quality";
import { DELIVERABLE_LABELS, SERVICE_LABELS } from "@/lib/domain/labels";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// This account's own usage — the same aggregation the admin-only
// cross-account page at src/app/admin/metrics uses, but handed a regular
// session client instead of the admin client, so RLS restricts every
// query to this account's own rows (see src/lib/metrics/usage.ts's
// docstring). Any teammate can view it, not just the owner — same
// "everything except team/billing/account-deletion is shared" model
// every other page on this account already follows.
export default async function AccountMetricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [metrics, engagementHealth, editSeverity] = await Promise.all([
    getUsageMetrics(supabase),
    getEngagementHealthSummary(supabase),
    getEditSeverityBreakdown(supabase),
  ]);
  const totalProjects =
    engagementHealth.counts.healthy + engagementHealth.counts.review_needed + engagementHealth.counts.stalled;

  const totalSucceeded = metrics.generationsByType.reduce((sum, t) => sum + t.succeeded, 0);
  const successRate =
    metrics.totalGenerations > 0 ? Math.round((totalSucceeded / metrics.totalGenerations) * 100) : null;
  const editRatePct =
    metrics.editRate.totalDeliverables > 0
      ? Math.round((metrics.editRate.editedDeliverables / metrics.editRate.totalDeliverables) * 100)
      : null;
  const sentAsIs = metrics.editRate.totalDeliverables - metrics.editRate.editedDeliverables;
  const mostUsedType = metrics.generationsByType[0];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>
        <h1 className="mb-1 mt-4 text-2xl font-semibold">Dashboards</h1>
        <p className="mb-8 text-sm text-muted">
          This account&apos;s own generation activity — every number below comes straight from your
          team&apos;s projects and deliverables, nothing estimated or industry-averaged.
        </p>

        {totalProjects > 0 && (
          <Card className="mb-8 flex flex-col gap-3">
            <h2 className="font-medium">Engagement health</h2>
            <p className="text-sm text-muted">
              A project is <strong>stalled</strong> if every deliverable attempted so far failed (or
              nothing was ever started, a week or more in), <strong>needs review</strong> if it&apos;s
              missing ready deliverables or has a partial failure, and <strong>healthy</strong>{" "}
              otherwise.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{engagementHealth.counts.healthy} healthy</Badge>
              <Badge tone="warning">{engagementHealth.counts.review_needed} need review</Badge>
              <Badge tone="error">{engagementHealth.counts.stalled} stalled</Badge>
            </div>
          </Card>
        )}

        {metrics.totalGenerations === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Nothing generated yet — this fills in as your team creates projects and generates
              deliverables.
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Deliverables generated" value={metrics.totalGenerations} />
              <StatTile label="Success rate" value={successRate === null ? "—" : `${successRate}%`} />
              <StatTile label="Exports" value={metrics.totalExports} />
              <StatTile label="Edit rate" value={editRatePct === null ? "—" : `${editRatePct}%`} />
            </div>

            {mostUsedType && (
              <Card className="mb-6 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted">Most-generated deliverable</span>
                <span className="text-lg font-semibold">
                  {DELIVERABLE_LABELS[mostUsedType.deliverableType] ?? mostUsedType.deliverableType}
                </span>
                <span className="text-sm text-muted">
                  {mostUsedType.succeeded + mostUsedType.failed + mostUsedType.other} generations
                </span>
              </Card>
            )}

            {metrics.editRate.totalDeliverables > 0 && (
              <Card className="mb-6 flex flex-col gap-3">
                <h2 className="font-medium">AI draft quality</h2>
                <p className="text-sm text-muted">
                  How much of the final delivered content differed from the first AI draft, measured
                  by real word-level text comparison — a documented heuristic (see
                  docs/validation-checklist.md), not a certified quality score.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">{sentAsIs} sent as-is</Badge>
                  <Badge tone="warning">{editSeverity.minorEdit} minor edits</Badge>
                  <Badge tone="error">{editSeverity.majorEdit} major edits</Badge>
                </div>
              </Card>
            )}

            <Card className="mb-6 flex flex-col gap-3">
              <h2 className="font-medium">Generations by deliverable type</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {metrics.generationsByType.map((row) => (
                  <li
                    key={row.deliverableType}
                    className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span>{DELIVERABLE_LABELS[row.deliverableType] ?? row.deliverableType}</span>
                    <span className="flex shrink-0 gap-2">
                      <Badge tone="success">{row.succeeded} succeeded</Badge>
                      {row.failed > 0 && <Badge tone="error">{row.failed} failed</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="mb-6 flex flex-col gap-3">
              <h2 className="font-medium">Most-selected services</h2>
              {metrics.servicesBySelection.length === 0 ? (
                <p className="text-sm text-muted">No projects yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {metrics.servicesBySelection.map((row) => (
                    <li key={row.serviceType} className="flex items-center justify-between gap-3">
                      <span>{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</span>
                      <span className="text-muted">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="mb-6 flex flex-col gap-3">
              <h2 className="font-medium">Most-used knowledge base entries</h2>
              {metrics.topKbEntries.length === 0 ? (
                <p className="text-sm text-muted">
                  No generations have referenced a knowledge base entry yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {metrics.topKbEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{entry.title}</span>
                      <span className="shrink-0 text-muted">{entry.useCount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="font-medium">Exports by format</h2>
              {metrics.exportsByFormat.length === 0 ? (
                <p className="text-sm text-muted">No exports yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {metrics.exportsByFormat.map((row) => (
                    <li key={row.format} className="flex items-center justify-between gap-3">
                      <span className="uppercase">{row.format}</span>
                      <span className="text-muted">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </Card>
  );
}
