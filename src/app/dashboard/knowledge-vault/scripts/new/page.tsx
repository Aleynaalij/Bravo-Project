import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScriptForm } from "../script-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function NewVaultScriptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="New script" backHref="/dashboard/knowledge-vault/scripts" backLabel="Back to Scripts" />
      <Card>
        <ScriptForm />
      </Card>
    </main>
  );
}
