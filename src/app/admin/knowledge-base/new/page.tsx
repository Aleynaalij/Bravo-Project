import { EntryForm } from "../entry-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default function NewKnowledgeBaseEntryPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="New Knowledge Base entry" />
      <Card>
        <EntryForm />
      </Card>
    </main>
  );
}
