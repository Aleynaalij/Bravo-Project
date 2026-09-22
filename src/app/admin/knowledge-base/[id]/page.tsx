import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getKnowledgeBaseEntry } from "@/lib/knowledge-base/service";
import { EntryForm } from "../entry-form";
import { deleteEntryAction } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function EditKnowledgeBaseEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const entry = await getKnowledgeBaseEntry(supabase, id);
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Edit entry"
        actions={
          <form action={deleteEntryAction}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        }
      />

      <Card>
        <EntryForm entry={entry} />
      </Card>
    </main>
  );
}
