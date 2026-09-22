import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listKnowledgeBaseEntries } from "@/lib/knowledge-base/service";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function KnowledgeBaseAdminPage() {
  const supabase = await createClient();
  const entries = await listKnowledgeBaseEntries(supabase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Knowledge Base"
        description="Reference content tagged by service and industry that every AI generation pulls from, so deliverables start from real Statement-of-Work language instead of a blank page."
        actions={<LinkButton href="/admin/knowledge-base/new">New entry</LinkButton>}
      />

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link href={`/admin/knowledge-base/${entry.id}`}>
              <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                <div className="font-medium">{entry.title}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <Badge tone="brand">{SERVICE_LABELS[entry.service_type]}</Badge>
                  {entry.industry ?? "General"}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
