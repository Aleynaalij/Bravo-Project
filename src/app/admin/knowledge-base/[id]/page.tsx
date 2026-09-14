import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKnowledgeBaseEntry } from "@/lib/knowledge-base/service";
import { EntryForm } from "../entry-form";
import { deleteEntryAction } from "../actions";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/admin/knowledge-base" className="text-sm text-brand hover:underline">
          &larr; Back to Knowledge Base
        </Link>

        <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Edit entry</h1>
          <form action={deleteEntryAction}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        </div>

        <Card>
          <EntryForm entry={entry} />
        </Card>
      </main>
    </>
  );
}
