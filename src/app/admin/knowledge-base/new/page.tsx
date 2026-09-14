import Link from "next/link";
import { EntryForm } from "../entry-form";

export default function NewKnowledgeBaseEntryPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/admin/knowledge-base" className="text-sm underline">
        &larr; Back to Knowledge Base
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">New Knowledge Base entry</h1>
      <EntryForm />
    </main>
  );
}
