import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCodingStandards } from "@/lib/automation/standards-service";
import { SCRIPT_TYPES } from "@/lib/validation/vault";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

const SCRIPT_TYPE_LABELS: Record<(typeof SCRIPT_TYPES)[number], string> = {
  powershell: "PowerShell",
  python: "Python",
  javascript: "JavaScript",
  bash: "Bash",
  graph_api: "Graph API",
  kql: "KQL",
  json: "JSON",
  terraform: "Terraform",
  bicep: "Bicep",
  arm_template: "ARM Template",
};

// Private per account (task #65's confirmed decision) — "how WE write
// PowerShell," not a platform-wide standard. Code Auditor grades pasted
// code against whichever of these matches its script type; Code Creator
// generates code meant to satisfy it.
export default async function StandardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const standards = await listCodingStandards(supabase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Coding Standards"
        description="Your team's own definition of how you write PowerShell, Python, Graph API, and infrastructure-as-code — Code Auditor and Code Creator both work from these."
        actions={<LinkButton href="/dashboard/automation/standards/new">New standard</LinkButton>}
      />

      {standards.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No standards defined yet — add one per language so Code Auditor and Code Creator have
            something specific to grade and generate against.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {standards.map((standard) => (
            <li key={standard.id}>
              <Link href={`/dashboard/automation/standards/${standard.id}`}>
                <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{SCRIPT_TYPE_LABELS[standard.script_type]}</span>
                    <Badge tone="neutral">{standard.required_elements.length} required elements</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">Defined by {standard.author_email}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    {standard.required_elements.map((el) => (
                      <span key={el}>#{el}</span>
                    ))}
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
