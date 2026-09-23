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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projects, recentDeliverables, engagementHealth] = await Promise.all([
    listProjectsWithServices(supabase),
    listRecentDeliverables(supabase, RECENT_ACTIVITY_LIMIT),
    getEngagementHealthSummary(supabase),
  ]);
  // Pure derived grouping over the projects already fetched above — no
  // second query, see src/lib/metrics/delivery-risk.ts.
  const deliveryRisk = summarizeDeliveryRisk(
    projects.map((project) => ({
      id: project.id,
      userCount: project.user_count,
      geographicLocations: project.geographic_locations,
      services: project.services,
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1
          className="text-display font-bold tracking-tight"
          style={{
            backgroundImage: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {projects.length === 0
            ? "Draft your first deliverable"
            : `${projects.length} project${projects.length === 1 ? "" : "s"} in flight`}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          {projects.length === 0
            ? "Start an intake for your first client engagement."
            : "Pick one up or start a new intake."}
        </p>
      </div>

      {recentDeliverables.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href="/dashboard/vault" className="text-sm text-brand hover:underline">
              View all in FileVault &rarr;
            </Link>
          </div>
          <Card className="mb-8">
            <div className="flex flex-col">
              {recentDeliverables.map((entry) => (
                <VaultEntryCard
                  key={entry.deliverableId}
                  projectId={entry.projectId}
                  customerName={entry.customerName}
                  entry={entry}
                  showCustomerName
                />
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <LinkButton href="/dashboard/new">New project</LinkButton>
      </div>

      <div className="mb-12 mt-16">
        <AskQueBar />
      </div>

      {projects.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Engagement health:</span>
          <Badge tone="success">{engagementHealth.counts.healthy} healthy</Badge>
          <Badge tone="warning">{engagementHealth.counts.review_needed} need review</Badge>
          <Badge tone="error">{engagementHealth.counts.stalled} stalled</Badge>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Delivery risk:</span>
          <Badge tone="success">{deliveryRisk.counts.low} low</Badge>
          <Badge tone="warning">{deliveryRisk.counts.elevated} elevated</Badge>
          <Badge tone="error">{deliveryRisk.counts.high} high</Badge>
        </div>
      )}

      {projects.length === 0 ? (
        <Card className="text-sm text-muted">
          No projects yet.{" "}
          <Link href="/dashboard/new" className="text-brand hover:underline">
            Start an intake
          </Link>
          .
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/dashboard/${project.id}`}>
                <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{project.customer_name}</span>
                        <Badge tone={HEALTH_TONE[engagementHealth.byProject[project.id] ?? "review_needed"]}>
                          {ENGAGEMENT_HEALTH_LABELS[engagementHealth.byProject[project.id] ?? "review_needed"]}
                        </Badge>
                        <Badge tone={RISK_TONE[deliveryRisk.byProject[project.id] ?? "low"]}>
                          {DELIVERY_RISK_LABELS[deliveryRisk.byProject[project.id] ?? "low"]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted">{project.industry}</div>
                    </div>
                    {project.services.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {project.services.slice(0, 5).map((service) => (
                          <span
                            key={service}
                            title={SERVICE_LABELS[service]}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-brand-light text-brand-dark"
                          >
                            <ServiceIcon service={service} className="h-3.5 w-3.5" />
                          </span>
                        ))}
                        {project.services.length > 5 && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-xs font-medium text-muted">
                            +{project.services.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
