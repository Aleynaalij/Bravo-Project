import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuditForm } from "./audit-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

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
