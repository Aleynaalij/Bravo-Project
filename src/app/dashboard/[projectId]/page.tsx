import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { listDeliverablesWithContent } from "@/lib/generation/deliverables";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import { ServicesForm } from "./services-form";
import { GenerateForm } from "./generate-form";

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
          <div key={deliverable.id} className="rounded-md border px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{DELIVERABLE_LABELS[deliverable.type]}</h3>
              <span className="text-xs uppercase text-gray-500">{deliverable.status}</span>
            </div>

            {deliverable.status === "ready" && deliverable.content && (
              <>
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  AI-generated draft — review before sending to a client. Not certified compliance
                  advice.
                </p>
                <div className="flex flex-col gap-4">
                  {deliverable.content.sections.map((section, i) => (
                    <div key={i}>
                      <h4 className="mb-1 text-sm font-semibold">{section.heading}</h4>
                      {section.paragraphs.map((p, j) => (
                        <p key={j} className="mb-1 text-sm text-gray-700">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {deliverable.status === "failed" && (
              <p className="text-sm text-red-700">Generation failed. Try again above.</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
