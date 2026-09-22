import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVaultScript } from "@/lib/vault/scripts-service";
import { ScriptForm } from "../script-form";
import { deleteVaultScriptAction } from "../actions";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard/knowledge-vault/scripts" className="text-sm text-brand hover:underline">
          &larr; Back to Scripts
        </Link>

        <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Edit script</h1>
          <form action={deleteVaultScriptAction}>
            <input type="hidden" name="id" value={script.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        </div>

        <Card>
          <ScriptForm script={script} />
        </Card>
      </main>
    </>
  );
}
