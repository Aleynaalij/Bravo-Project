import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjectsWithServices } from "@/lib/projects/service";
import { listRecentDeliverables } from "@/lib/vault/service";
import { getEngagementHealthSummary, ENGAGEMENT_HEALTH_LABELS, type EngagementHealth } from "@/lib/metrics/engagement";
import { summarizeDeliveryRisk, DELIVERY_RISK_LABELS, type DeliveryRisk } from "@/lib/metrics/delivery-risk";
import { VaultEntryCard } from "./vault/vault-entry-card";
import { AskQueBar } from "@/components/assistant/ask-que-bar";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/icons";
import { SERVICE_LABELS } from "@/lib/domain/labels";

const HEALTH_TONE: Record<EngagementHealth, BadgeTone> = {
  healthy: "success",
  review_needed: "warning",
  stalled: "error",
};

const RISK_TONE: Record<DeliveryRisk, BadgeTone> = {
  low: "success",
  elevated: "warning",
  high: "error",
};

const RECENT_ACTIVITY_LIMIT = 5;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projects, recentDeliverables, engagementHealth] = await Promise.all([
    listProjectsWithServices(supabase),
    listRecentDeliverables(supabase, RECENT_ACTIVITY_LIMIT),
    getEngagementHealthSummary(supabase),
  ]);
  const deliveryRisk = summarizeDeliveryRisk(projects.map((project) => ({
    id: project.id,
    userCount: project.user_count,
    geographicLocations: project.geographic_locations,
    services: project.services,
  })));
  const atRisk = deliveryRisk.counts.elevated + deliveryRisk.counts.high;

  return (
    <main className="qp-dashboard mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-9">
      <section className="qp-hero relative overflow-hidden rounded-[28px] px-6 py-8 text-white sm:px-9 sm:py-10 lg:px-11">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">QuePilot / Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {projects.length === 0 ? "Ready for your first engagement?" : "Move the work forward."}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
            {projects.length === 0
              ? "Start a client intake, define the work, and turn what you know into a clear deliverable."
              : "Your engagements, deliverables, and next moves are all in one place."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/dashboard/new" className="!bg-cyan-300 !px-5 !py-3 !font-semibold !text-slate-950 hover:!bg-cyan-200">
              New project <span aria-hidden="true">↗</span>
            </LinkButton>
            <Link href="/dashboard/vault" className="inline-flex items-center rounded-lg border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">
              Open FileVault <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="qp-hero-orbit" aria-hidden="true" />
      </section>

      <section aria-label="Workspace snapshot" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="qp-snapshot"><p className="qp-snapshot-label">Projects</p><p className="qp-snapshot-value">{projects.length}</p><p className="qp-snapshot-detail">Client engagements</p></Card>
        <Card className="qp-snapshot"><p className="qp-snapshot-label">Healthy</p><p className="qp-snapshot-value text-success-text">{engagementHealth.counts.healthy}</p><p className="qp-snapshot-detail">On track</p></Card>
        <Card className="qp-snapshot"><p className="qp-snapshot-label">Delivery risk</p><p className="qp-snapshot-value text-warning-text">{atRisk}</p><p className="qp-snapshot-detail">Elevated or high</p></Card>
        <Card className="qp-snapshot"><p className="qp-snapshot-label">Recent files</p><p className="qp-snapshot-value">{recentDeliverables.length}</p><p className="qp-snapshot-detail">Latest activity shown</p></Card>
      </section>

      <div className={`mt-9 grid gap-8 ${projects.length > 0 ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
        {projects.length > 0 && <section aria-labelledby="projects-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="qp-eyebrow">Engagements</p><h2 id="projects-heading" className="mt-1 text-2xl font-semibold tracking-tight">Projects</h2></div>
            <Link href="/dashboard/new" className="text-sm font-semibold text-brand hover:underline">+ New project</Link>
          </div>
          <ul className="grid gap-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href={`/dashboard/${project.id}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                    <Card className="qp-project-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-brand group-hover:shadow-lg sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge tone={HEALTH_TONE[engagementHealth.byProject[project.id] ?? "review_needed"]}>{ENGAGEMENT_HEALTH_LABELS[engagementHealth.byProject[project.id] ?? "review_needed"]}</Badge>
                            <Badge tone={RISK_TONE[deliveryRisk.byProject[project.id] ?? "low"]}>{DELIVERY_RISK_LABELS[deliveryRisk.byProject[project.id] ?? "low"]} risk</Badge>
                          </div>
                          <h3 className="truncate text-lg font-semibold tracking-tight group-hover:text-brand">{project.customer_name}</h3>
                          <p className="mt-1 text-sm text-muted">{project.industry} · {project.services.length} service{project.services.length === 1 ? "" : "s"} in scope</p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true">↗</span>
                      </div>
                      {project.services.length > 0 && <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                        {project.services.slice(0, 4).map((service) => <span key={service} className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted"><ServiceIcon service={service} className="h-3.5 w-3.5 text-brand" />{SERVICE_LABELS[service]}</span>)}
                        {project.services.length > 4 && <span className="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">+{project.services.length - 4} more</span>}
                      </div>}
                    </Card>
                  </Link>
                </li>
              ))}
          </ul>
        </section>}

        <aside className={`min-w-0 ${projects.length > 0 ? "space-y-5" : "grid gap-5 md:grid-cols-2"}` } aria-label="Quick tools">
          <Card className="qp-que-card p-5 sm:p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-lg font-semibold text-brand">Q</div>
            <p className="qp-eyebrow">Your copilot</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Ask Que</h2>
            <p className="mb-4 mt-2 text-sm leading-6 text-muted">A quick answer for a technical question or your next step.</p>
            <AskQueBar />
          </Card>
          <Card className="p-5 sm:p-6">
            <p className="qp-eyebrow">Shortcuts</p>
            <h2 className="mt-1 text-lg font-semibold">Jump back in</h2>
            <div className="mt-4 divide-y divide-border text-sm font-medium">
              <Link className="qp-quick-link" href="/dashboard/metrics">Dashboards <span aria-hidden="true">↗</span></Link>
              <Link className="qp-quick-link" href="/dashboard/automation">Automation Center <span aria-hidden="true">↗</span></Link>
              <Link className="qp-quick-link" href="/dashboard/knowledge-vault">Knowledge Vault <span aria-hidden="true">↗</span></Link>
            </div>
          </Card>
        </aside>
      </div>

      {recentDeliverables.length > 0 && <section aria-labelledby="recent-heading" className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="qp-eyebrow">What’s new</p><h2 id="recent-heading" className="mt-1 text-2xl font-semibold tracking-tight">Recent activity</h2></div>
          <Link href="/dashboard/vault" className="text-sm font-semibold text-brand hover:underline">View all in FileVault →</Link>
        </div>
        <Card className="overflow-hidden !p-0"><div className="flex flex-col">{recentDeliverables.map((entry) => <VaultEntryCard key={entry.deliverableId} projectId={entry.projectId} customerName={entry.customerName} entry={entry} showCustomerName />)}</div></Card>
      </section>}
    </main>
  );
}
