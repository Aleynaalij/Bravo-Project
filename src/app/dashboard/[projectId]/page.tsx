import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { hasVaultEntryForProject } from "@/lib/vault/entries-service";
import { listDeliverablesWithContent } from "@/lib/generation/deliverables";
import { PROJECT_STATUS_LABELS } from "@/lib/domain/labels";
import { ServicesForm } from "./services-form";
import { GenerateForm } from "./generate-form";
import { DeliverableView } from "./deliverable-view";
import { DeleteProjectButton } from "./delete-project-button";
import { CloseProjectButton } from "./close-project-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const project = await getProject(supabase, projectId);
  if (!project) {
    notFound();
  }

  const [deliverables, hasCapture] = await Promise.all([
    listDeliverablesWithContent(supabase, projectId),
    hasVaultEntryForProject(supabase, projectId),
  ]);
  const isClosed = project.status === "closed";

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {project.customer_name}
            <Badge tone={isClosed ? "neutral" : "success"}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </span>
        }
        description={
          <>
            {project.industry} &middot; {project.user_count} users &middot; {project.licensing_tier}
          </>
        }
      />

      {(project.geographic_locations.length > 0 || project.compliance_notes) && (
        <Card className="mb-6 flex flex-col gap-2">
          {project.geographic_locations.length > 0 && (
            <p className="text-sm">
              <span className="font-medium">Locations:</span>{" "}
              {project.geographic_locations.join(", ")}
            </p>
          )}
          {project.compliance_notes && (
            <p className="text-sm">
              <span className="font-medium">Compliance notes:</span> {project.compliance_notes}
            </p>
          )}
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Services in scope</h2>
      <Card>
        <ServicesForm projectId={project.id} currentServices={project.services} isClosed={isClosed} />
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Deliverables</h2>
      <Card>
        <GenerateForm projectId={project.id} services={project.services} isClosed={isClosed} />
      </Card>

      <div className="mt-6 flex flex-col gap-6">
        {deliverables.map((deliverable) => (
          <DeliverableView key={deliverable.id} projectId={project.id} deliverable={deliverable} />
        ))}
      </div>

      <Card className="mt-10 flex flex-col gap-3">
        <h2 className="font-medium">Architecture Advisor</h2>
        <p className="text-sm text-muted">
          Propose a Microsoft 365 / Purview architecture for this engagement — prefilled from its industry, user
          count, licensing tier, and compliance notes.
        </p>
        <LinkButton href={`/dashboard/architecture-advisor?projectId=${project.id}`} variant="secondary" className="w-fit">
          Propose architecture
        </LinkButton>
      </Card>

      {!isClosed && (
        <Card className="mt-10 flex flex-col gap-3">
          <h2 className="font-medium">Close project</h2>
          <p className="text-sm text-muted">
            Locks this engagement read-only — no new deliverables, no changes to services in scope.
          </p>
          <CloseProjectButton projectId={project.id} customerName={project.customer_name} canClose={hasCapture} />
        </Card>
      )}

      <Card className="mt-10 flex flex-col gap-3 border-error-border">
        <h2 className="font-medium text-error-text">Danger zone</h2>
        <p className="text-sm text-muted">
          Permanently deletes this project and every generated deliverable. This can&apos;t be undone.
        </p>
        <DeleteProjectButton projectId={project.id} customerName={project.customer_name} />
      </Card>
    </main>
  );
}
