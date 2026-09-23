import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { ArchitectureAdvisorForm } from "./architecture-advisor-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

// Standalone tool — reachable directly from the top nav for a pre-sales
// "what-if" run, or deep-linked from a project's page (?projectId=...)
// with the form prefilled from that project's own intake fields
// (industry, user count, licensing tier, compliance notes).
//
// Same reasoning as Code Creator's page.tsx: the advisor calls
// generateCompletion synchronously for a response that also includes a
// full architecture diagram, no maxDuration was set anywhere in the app,
// and this can exceed Vercel's 10s default and get killed before the
// request can even record an error.
export const maxDuration = 120;

export default async function ArchitectureAdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = projectId ? await getProject(supabase, projectId) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Architecture Advisor"
        description="Propose a Microsoft 365 / Purview architecture — recommended services, a diagram, a deployment roadmap, and risks — for a prospective or in-flight engagement."
      />
      <Card>
        <ArchitectureAdvisorForm project={project} />
      </Card>
    </main>
  );
}
