import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsageMetrics, groupServicesByPracticeArea } from "@/lib/metrics/usage";
import { getEngagementHealthSummary } from "@/lib/metrics/engagement";
import { getEditSeverityBreakdown } from "@/lib/metrics/quality";
import { summarizeDeliveryRisk } from "@/lib/metrics/delivery-risk";
import { getVaultMetrics } from "@/lib/metrics/vault";
import { getKnowledgeMetrics, KNOWLEDGE_PERIOD_DAYS } from "@/lib/metrics/knowledge";
import { getAllConsultantContributionCounts } from "@/lib/team/contributions";
import { listProjectsWithServices } from "@/lib/projects/service";
import { DELIVERABLE_LABELS, SERVICE_LABELS } from "@/lib/domain/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/bar-chart";
import { StatusBar } from "@/components/charts/status-bar";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/ui/tabs";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "knowledge", label: "Knowledge" },
  { key: "consultants", label: "Consultants" },
];

const PAGE_TITLE = "Dashboards";
const PAGE_DESCRIPTION =
  "This account's own generation activity — every number below comes straight from your team's projects and deliverables, nothing estimated or industry-averaged.";

// This account's own usage — the same aggregation the admin-only
// cross-account page at src/app/admin/metrics uses, but handed a regular
// session client instead of the admin client, so RLS restricts every
// query to this account's own rows (see src/lib/metrics/usage.ts's
// docstring). Any teammate can view it, not just the owner — same
// "everything except team/billing/account-deletion is shared" model
// every other page on this account already follows.
export default async function AccountMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam ?? "overview";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (tab === "knowledge") {
    const knowledgeMetrics = await getKnowledgeMetrics(supabase);
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Tabs items={TABS} active={tab} basePath="/dashboard/metrics" />

        <div className="mb-8 grid grid-cols-2 gap-3">
          <StatTile
            label={`New SOPs (last ${KNOWLEDGE_PERIOD_DAYS} days)`}
            value={knowledgeMetrics.newSopsThisPeriod}
          />
          <StatTile
            label={`New playbooks (last ${KNOWLEDGE_PERIOD_DAYS} days)`}
            value={knowledgeMetrics.newPlaybooksThisPeriod}
          />
        </div>

        <Card className="flex flex-col gap-3">
          <h2 className="font-medium">Most cross-referenced vault entries</h2>
          <p className="text-sm text-muted">
            Lessons learned and incidents that Troubleshooting Engine surfaced as similar history, or
            that a SOP or playbook author explicitly linked as related — the entries your team keeps
            pointing back to.
          </p>
          {knowledgeMetrics.mostCrossReferencedEntries.length === 0 ? (
            <p className="text-sm text-muted">No cross-references yet.</p>
          ) : (
            <BarChart
              rows={knowledgeMetrics.mostCrossReferencedEntries.map((entry) => ({
                label: entry.title,
                value: entry.referenceCount,
              }))}
            />
          )}
        </Card>
      </main>
    );
  }

  if (tab === "consultants") {
    const contributionCounts = await getAllConsultantContributionCounts(supabase);
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <Tabs items={TABS} active={tab} basePath="/dashboard/metrics" />

        <Card className="flex flex-col gap-3">
          <h2 className="font-medium">Contributions by teammate</h2>
          <p className="text-sm text-muted">
            Lessons learned, incidents, scripts, SOPs, and playbooks authored, all four content
            types combined into one total per person.
          </p>
          {contributionCounts.length === 0 ? (
            <p className="text-sm text-muted">Nobody has authored any content yet.</p>
          ) : (
            <BarChart
              rows={contributionCounts.map((row) => ({ label: row.authorEmail, value: row.count }))}
            />
          )}
        </Card>
      </main>
    );
  }

  const [metrics, engagementHealth, editSeverity, projects, vaultMetrics] = await Promise.all([
    getUsageMetrics(supabase),
    getEngagementHealthSummary(supabase),
    getEditSeverityBreakdown(supabase),
    listProjectsWithServices(supabase),
    getVaultMetrics(supabase),
  ]);
  const totalProjects =
    engagementHealth.counts.healthy + engagementHealth.counts.review_needed + engagementHealth.counts.stalled;
  const deliveryRisk = summarizeDeliveryRisk(
    projects.map((project) => ({
      id: project.id,
      userCount: project.user_count,
      geographicLocations: project.geographic_locations,
      services: project.services,
    })),
  );

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      <Tabs items={TABS} active={tab} basePath="/dashboard/metrics" />

      {tab === "overview" && (
        <>
          {totalProjects > 0 && (
            <Card className="mb-8 flex flex-col gap-3">
              <h2 className="font-medium">Engagement health</h2>
              <p className="text-sm text-muted">
                A project is <strong>stalled</strong> if every deliverable attempted so far failed
                (or nothing was ever started, a week or more in), <strong>needs review</strong> if
                it&apos;s missing ready deliverables or has a partial failure, and{" "}
                <strong>healthy</strong> otherwise.
              </p>
              <StatusBar
                segments={[
                  { label: "Healthy", count: engagementHealth.counts.healthy, tone: "success" },
                  { label: "Needs review", count: engagementHealth.counts.review_needed, tone: "warning" },
                  { label: "Stalled", count: engagementHealth.counts.stalled, tone: "error" },
                ]}
              />
            </Card>
          )}

          {totalProjects > 0 && (
            <Card className="mb-8 flex flex-col gap-3">
              <h2 className="font-medium">Delivery risk</h2>
              <p className="text-sm text-muted">
                A scoping-time signal from this project&apos;s own intake data, not a prediction:
                points accrue for a large user population (1,000+, another point at 5,000+),
                multi-region scope, and a wide compliance-service footprint (4 or more Data
                Security &amp; Compliance services in scope at once). 1 point is{" "}
                <strong>elevated</strong>, 3 or more is <strong>high</strong>.
              </p>
              <StatusBar
                segments={[
                  { label: "Low", count: deliveryRisk.counts.low, tone: "success" },
                  { label: "Elevated", count: deliveryRisk.counts.elevated, tone: "warning" },
                  { label: "High", count: deliveryRisk.counts.high, tone: "error" },
                ]}
              />
            </Card>
          )}

          {(vaultMetrics.totalEntries > 0 || vaultMetrics.totalScripts > 0) && (
            <Card className="mb-8 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium">Knowledge vault</h2>
                <Link href="/dashboard/knowledge-vault" className="text-sm text-brand hover:underline">
                  Open vault &rarr;
                </Link>
              </div>
              <p className="text-sm text-muted">
                Your team&apos;s own captured lessons learned, incidents, and scripts — private to
                this account.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Lessons &amp; incidents" value={vaultMetrics.totalEntries} />
                <StatTile label="Scripts" value={vaultMetrics.totalScripts} />
              </div>
              {vaultMetrics.totalEntries > 0 && (
                <StatusBar
                  segments={[
                    { label: "Lessons learned", count: vaultMetrics.counts.lessonLearned, tone: "success" },
                    { label: "Incidents", count: vaultMetrics.counts.incident, tone: "warning" },
                  ]}
                />
              )}
              {vaultMetrics.entriesByService.length > 0 && (
                <div className="border-t border-border pt-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Entries by service
                  </h3>
                  <BarChart
                    rows={vaultMetrics.entriesByService.map((row) => ({
                      label: SERVICE_LABELS[row.serviceType] ?? row.serviceType,
                      value: row.count,
                    }))}
                  />
                </div>
              )}
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
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Most-generated deliverable
                  </span>
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
                    How much of the final delivered content differed from the first AI draft,
                    measured by real word-level text comparison — a documented heuristic (see
                    docs/validation-checklist.md), not a certified quality score.
                  </p>
                  <StatusBar
                    segments={[
                      { label: "Sent as-is", count: sentAsIs, tone: "success" },
                      { label: "Minor edits", count: editSeverity.minorEdit, tone: "warning" },
                      { label: "Major edits", count: editSeverity.majorEdit, tone: "error" },
                    ]}
                  />
                </Card>
              )}

              <Card className="mb-6 flex flex-col gap-3">
                <h2 className="font-medium">Generations by deliverable type</h2>
                <BarChart
                  rows={metrics.generationsByType.map((row) => ({
                    label: DELIVERABLE_LABELS[row.deliverableType] ?? row.deliverableType,
                    value: row.succeeded + row.failed + row.other,
                    annotation: (
                      <span className="flex shrink-0 gap-2">
                        <Badge tone="success">{row.succeeded} succeeded</Badge>
                        {row.failed > 0 && <Badge tone="error">{row.failed} failed</Badge>}
                      </span>
                    ),
                  }))}
                />
              </Card>

              <Card className="mb-6 flex flex-col gap-3">
                <h2 className="font-medium">Most-selected services</h2>
                {metrics.servicesBySelection.length === 0 ? (
                  <p className="text-sm text-muted">No projects yet.</p>
                ) : (
                  <>
                    <BarChart
                      rows={metrics.servicesBySelection.map((row) => ({
                        label: SERVICE_LABELS[row.serviceType] ?? row.serviceType,
                        value: row.count,
                      }))}
                    />
                    <div className="border-t border-border pt-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        By practice area
                      </h3>
                      <BarChart
                        rows={groupServicesByPracticeArea(metrics.servicesBySelection).map((row) => ({
                          label: row.label,
                          value: row.count,
                        }))}
                      />
                    </div>
                  </>
                )}
              </Card>

              <Card className="mb-6 flex flex-col gap-3">
                <h2 className="font-medium">Most-used knowledge base entries</h2>
                {metrics.topKbEntries.length === 0 ? (
                  <p className="text-sm text-muted">
                    No generations have referenced a knowledge base entry yet.
                  </p>
                ) : (
                  <BarChart
                    rows={metrics.topKbEntries.map((entry) => ({ label: entry.title, value: entry.useCount }))}
                  />
                )}
              </Card>

              <Card className="flex flex-col gap-3">
                <h2 className="font-medium">Exports by format</h2>
                {metrics.exportsByFormat.length === 0 ? (
                  <p className="text-sm text-muted">No exports yet.</p>
                ) : (
                  <BarChart
                    rows={metrics.exportsByFormat.map((row) => ({
                      label: row.format.toUpperCase(),
                      value: row.count,
                    }))}
                  />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </main>
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
