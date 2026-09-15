import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listKnowledgeBaseEntries } from "@/lib/knowledge-base/service";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

export default async function KnowledgeBaseAdminPage() {
  const supabase = await createClient();
  const entries = await listKnowledgeBaseEntries(supabase);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm text-brand hover:underline">
              &larr; Back to projects
            </Link>
            <h1 className="mb-1 mt-4 text-2xl font-semibold">Knowledge Base</h1>
            <p className="max-w-md text-sm text-muted">
              Reference content tagged by service and industry that every AI generation pulls
              from, so deliverables start from real Statement-of-Work language instead of a
              blank page.
            </p>
          </div>
          <LinkButton href="/admin/knowledge-base/new">New entry</LinkButton>
        </div>

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
    </>
  );
}
