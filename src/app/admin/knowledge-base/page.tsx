import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listKnowledgeBaseEntries } from "@/lib/knowledge-base/service";
import { SERVICE_LABELS } from "@/lib/domain/labels";

export default async function KnowledgeBaseAdminPage() {
  const supabase = await createClient();
  const entries = await listKnowledgeBaseEntries(supabase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm underline">
            &larr; Back to projects
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Knowledge Base</h1>
        </div>
        <Link
          href="/admin/knowledge-base/new"
          className="h-fit rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          New entry
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/admin/knowledge-base/${entry.id}`}
              className="block rounded-md border px-4 py-3 hover:bg-gray-50"
            >
              <div className="font-medium">{entry.title}</div>
              <div className="text-sm text-gray-600">
                {SERVICE_LABELS[entry.service_type]}
                {entry.industry ? ` · ${entry.industry}` : " · General"}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
