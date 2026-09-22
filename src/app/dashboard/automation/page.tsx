import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

interface AutomationFeature {
  href: string;
  title: string;
  description: string;
}

const FEATURES: AutomationFeature[] = [
  {
    href: "/dashboard/knowledge-vault/scripts",
    title: "Script Vault",
    description: "Your team's searchable library of PowerShell, Graph API, and infrastructure-as-code scripts.",
  },
  {
    href: "/dashboard/automation/audit",
    title: "Code Auditor",
    description: "Paste a script and get a structured review — security, performance, and best-practice findings, graded against your own standards.",
  },
  {
    href: "/dashboard/automation/creator",
    title: "Code Creator",
    description: "Describe what you need, answer a few environment-aware requirements, and get a generated script back.",
  },
  {
    href: "/dashboard/automation/standards",
    title: "Coding Standards",
    description: "Define how your team writes PowerShell, Python, Graph API, and infrastructure-as-code — what Code Auditor and Code Creator both work from.",
  },
];

// The hub this build's brief asked for: one place that ties Script Vault
// (existing, from the EKS build), Code Auditor, Code Creator, and Coding
// Standards together as a single "QuePilot applies organizational
// expertise to automation" capability, rather than four unrelated pages.
export default async function AutomationCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Automation Center"
        description="Your team's own scripts, standards, and AI-assisted tooling for building and reviewing automation — grounded in how your team actually works, not generic guidance."
      />

      <ul className="flex flex-col gap-2">
        {FEATURES.map((feature) => (
          <li key={feature.href}>
            <Link href={feature.href}>
              <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                <span className="font-medium">{feature.title}</span>
                <p className="mt-1 text-sm text-muted">{feature.description}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
