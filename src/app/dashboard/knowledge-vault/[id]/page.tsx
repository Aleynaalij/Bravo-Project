import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVaultEntry } from "@/lib/vault/entries-service";
import { listProjects } from "@/lib/projects/service";
import { EntryForm } from "../entry-form";
import { deleteVaultEntryAction } from "../actions";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function EditVaultEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [entry, projects] = await Promise.all([getVaultEntry(supabase, id), listProjects(supabase)]);
  if (!entry) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard/knowledge-vault" className="text-sm text-brand hover:underline">
          &larr; Back to Knowledge Vault
        </Link>

        <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Edit entry</h1>
          <form action={deleteVaultEntryAction}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        </div>

        <Card>
          <EntryForm entry={entry} projects={projects} />
        </Card>
      </main>
    </>
  );
}
