import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVaultEntry } from "@/lib/vault/entries-service";
import { listProjects } from "@/lib/projects/service";
import { EntryForm } from "../entry-form";
import { deleteVaultEntryAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

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
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Edit entry"
        actions={
          <form action={deleteVaultEntryAction}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        }
      />

      <Card>
        <EntryForm entry={entry} projects={projects} />
      </Card>
    </main>
  );
}
