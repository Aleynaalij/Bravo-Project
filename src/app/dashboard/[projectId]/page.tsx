import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { listDeliverablesWithContent } from "@/lib/generation/deliverables";
import { ServicesForm } from "./services-form";
import { GenerateForm } from "./generate-form";
import { DeliverableView } from "./deliverable-view";

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

  const deliverables = await listDeliverablesWithContent(supabase, projectId);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm underline">
        &larr; Back to projects
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-semibold">{project.customer_name}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {project.industry} &middot; {project.user_count} users &middot; {project.licensing_tier}
      </p>

      {project.geographic_locations.length > 0 && (
        <p className="mb-2 text-sm">
          <span className="font-medium">Locations:</span>{" "}
          {project.geographic_locations.join(", ")}
        </p>
      )}

      {project.compliance_notes && (
        <p className="mb-6 text-sm">
          <span className="font-medium">Compliance notes:</span> {project.compliance_notes}
        </p>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Services in scope</h2>
      <ServicesForm projectId={project.id} currentServices={project.services} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Deliverables</h2>
      <GenerateForm projectId={project.id} />

      <div className="mt-6 flex flex-col gap-6">
        {deliverables.map((deliverable) => (
          <DeliverableView key={deliverable.id} projectId={project.id} deliverable={deliverable} />
        ))}
      </div>
    </main>
  );
}
