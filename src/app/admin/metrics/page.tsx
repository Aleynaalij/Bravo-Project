import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsageMetrics, groupServicesByPracticeArea } from "@/lib/metrics/usage";
import { getPlanDistribution } from "@/lib/metrics/billing";
import { getEditSeverityBreakdown } from "@/lib/metrics/quality";
import { DELIVERABLE_LABELS, SERVICE_LABELS } from "@/lib/domain/labels";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Admin-only cross-account usage metrics — platform-operator visibility
// across every customer account, distinct from the per-account dashboard
// at src/app/dashboard/metrics (one consultant firm's own numbers).
// Gated by the /admin layout's requirePlatformAdmin — this page itself
// does no further access check. Reads via the admin client, not a
// session client — see src/lib/metrics/usage.ts's own docstring for why
// that one client choice is what scopes this to "every account" instead
// of "my account."
export default async function MetricsPage() {
  const admin = createAdminClient();
  const [metrics, planDistribution, editSeverity] = await Promise.all([
    getUsageMetrics(admin),
    getPlanDistribution(admin),
    getEditSeverityBreakdown(admin),
  ]);

  const totalSucceeded = metrics.generationsByType.reduce((sum, t) => sum + t.succeeded, 0);
  const successRate =
    metrics.totalGenerations > 0 ? Math.round((totalSucceeded / metrics.totalGenerations) * 100) : null;
  const editRatePct =
    metrics.editRate.totalDeliverables > 0
      ? Math.round((metrics.editRate.editedDeliverables / metrics.editRate.totalDeliverables) * 100)
      : null;
  const sentAsIs = metrics.editRate.totalDeliverables - metrics.editRate.editedDeliverables;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>
        <h1 className="mb-1 mt-4 text-2xl font-semibold">Usage metrics</h1>
        <p className="mb-8 text-sm text-muted">
          Platform-wide, across every account — not a per-customer analytics view.
        </p>

        <Card className="mb-8 flex flex-col gap-3">
          <h2 className="font-medium">Accounts &amp; billing</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Accounts" value={planDistribution.totalAccounts} />
            <StatTile label="Seats billed" value={planDistribution.totalSeatsBilled} />
            <StatTile
              label="No subscription yet"
              value={planDistribution.accountsWithNoSubscriptionRow}
            />
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Accounts by plan
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {planDistribution.accountsByPlan.map((row) => (
                <li key={row.plan} className="flex items-center justify-between gap-3">
                  <span className="capitalize">{row.plan}</span>
                  <span className="text-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
          {planDistribution.subscriptionsByStatus.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Subscriptions by status
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {planDistribution.subscriptionsByStatus.map((row) => (
                  <li key={row.status} className="flex items-center justify-between gap-3">
                    <span className="capitalize">{row.status}</span>
                    <span className="text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            No MRR/ARR figure here — that needs each Stripe price&apos;s real dollar amount, which
            isn&apos;t available without a configured Stripe API key.
          </p>
        </Card>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Generations" value={metrics.totalGenerations} />
          <StatTile label="Success rate" value={successRate === null ? "—" : `${successRate}%`} />
          <StatTile label="Exports" value={metrics.totalExports} />
          <StatTile label="Edit rate" value={editRatePct === null ? "—" : `${editRatePct}%`} />
        </div>

        {metrics.editRate.totalDeliverables > 0 && (
          <Card className="mb-6 flex flex-col gap-3">
            <h2 className="font-medium">AI draft quality</h2>
            <p className="text-sm text-muted">
              How much of the final delivered content differed from the first AI draft, measured by
              real word-level text comparison — a documented heuristic (see
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
          {metrics.generationsByType.length === 0 ? (
            <p className="text-sm text-muted">No generations yet.</p>
          ) : (
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
          )}
        </Card>

        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="font-medium">Most-selected services</h2>
          {metrics.servicesBySelection.length === 0 ? (
            <p className="text-sm text-muted">No projects yet.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2 text-sm">
                {metrics.servicesBySelection.map((row) => (
                  <li key={row.serviceType} className="flex items-center justify-between gap-3">
                    <span>{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</span>
                    <span className="text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-3">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  By practice area
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {groupServicesByPracticeArea(metrics.servicesBySelection).map((row) => (
                    <li key={row.practiceArea} className="flex items-center justify-between gap-3">
                      <span>{row.label}</span>
                      <span className="text-muted">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </Card>

        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="font-medium">Most-used knowledge base entries</h2>
          {metrics.topKbEntries.length === 0 ? (
            <p className="text-sm text-muted">No generations have referenced a knowledge base entry yet.</p>
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

        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="font-medium">Unused knowledge base entries</h2>
          <p className="text-sm text-muted">
            Never referenced by any generated deliverable across any account — a candidate for
            improvement, or evidence nobody needs it in its current form.
          </p>
          {metrics.unusedKbEntries.length === 0 ? (
            <p className="text-sm text-muted">Every entry has been referenced at least once.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {metrics.unusedKbEntries.map((entry) => (
                <li key={entry.id} className="truncate">
                  {entry.title}
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
