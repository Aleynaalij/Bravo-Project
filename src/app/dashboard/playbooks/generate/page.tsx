import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/service";
import { GenerateForm } from "./generate-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function GeneratePlaybookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projects = await listProjects(supabase);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Generate playbook with AI"
        description="Drafts a full playbook against the fixed 12-section structure — review and edit before publishing."
      />
      <Card>
        <GenerateForm projects={projects} />
      </Card>
    </main>
  );
}
