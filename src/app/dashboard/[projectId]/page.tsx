import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { updateServicesAction } from "./actions";

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
      <form action={updateServicesAction} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        {SERVICE_TYPES.map((service) => (
          <label key={service} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="services"
              value={service}
              defaultChecked={project.services.includes(service)}
            />
            {SERVICE_LABELS[service]}
          </label>
        ))}
        <button
          type="submit"
          className="mt-2 w-fit rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Save services
        </button>
      </form>

      <div className="mt-10 rounded-md border border-dashed px-4 py-6 text-sm text-gray-600">
        Deliverable generation (Epic D) isn&apos;t built yet — this is where
        Executive Summary, SOW, and High-Level Design drafts will appear.
      </div>
    </main>
  );
}
