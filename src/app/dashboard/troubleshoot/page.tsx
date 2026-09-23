import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/service";
import { TroubleshootForm } from "./troubleshoot-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

// Same reasoning as Code Creator's page.tsx: runTroubleshoot calls
// generateCompletion synchronously, no maxDuration was set anywhere in
// the app, and a longer diagnosis response can exceed Vercel's 10s
// default and get killed before the request can even record an error.
export const maxDuration = 120;

export default async function TroubleshootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projects = await listProjects(supabase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Troubleshooting Engine"
        description="Describe a problem and get a structured diagnosis — potential causes, a troubleshooting flow, and similar historical issues from your own Knowledge Vault."
      />
      <Card>
        <TroubleshootForm projects={projects} />
      </Card>
    </main>
  );
}
