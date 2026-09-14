import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKnowledgeBaseEntry } from "@/lib/knowledge-base/service";
import { EntryForm } from "../entry-form";
import { deleteEntryAction } from "../actions";

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
      <Link href="/admin/knowledge-base" className="text-sm underline">
        &larr; Back to Knowledge Base
      </Link>

      <div className="mb-6 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit entry</h1>
        <form action={deleteEntryAction}>
          <input type="hidden" name="id" value={entry.id} />
          <button type="submit" className="text-sm text-red-700 underline">
            Delete
          </button>
        </form>
      </div>

      <EntryForm entry={entry} />
    </main>
  );
}
