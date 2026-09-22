import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVaultScript } from "@/lib/vault/scripts-service";
import { ScriptForm } from "../script-form";
import { deleteVaultScriptAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditVaultScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const script = await getVaultScript(supabase, id);
  if (!script) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Edit script"
        backHref="/dashboard/knowledge-vault/scripts"
        backLabel="Back to Scripts"
        actions={
          <form action={deleteVaultScriptAction}>
            <input type="hidden" name="id" value={script.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        }
      />

      <Card>
        <ScriptForm script={script} />
      </Card>
    </main>
  );
}
