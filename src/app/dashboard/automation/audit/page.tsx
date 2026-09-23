import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuditForm } from "./audit-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

// Same reasoning as Code Creator's page.tsx: runCodeAudit calls
// generateCompletion synchronously, no maxDuration was set anywhere in
// the app, and a longer review response can exceed Vercel's 10s default
// and get killed before the request can even record an error.
export const maxDuration = 60;

export default async function CodeAuditorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Code Auditor"
        description="Paste a script and get a structured review — security, performance, maintainability, reliability, and best-practice findings, graded against your own coding standards where you've defined them."
      />
      <Card>
        <AuditForm />
      </Card>
    </main>
  );
}
