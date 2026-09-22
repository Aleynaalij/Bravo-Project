import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVaultEntries } from "@/lib/vault/entries-service";
import { searchVault } from "@/lib/vault/search";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import type { VaultEntryRow } from "@/lib/vault/entries-service";

const ENTRY_TYPE_TONE = { lesson_learned: "success", incident: "warning" } as const;
const ENTRY_TYPE_LABEL = { lesson_learned: "Lesson learned", incident: "Incident" } as const;

function snippet(entry: VaultEntryRow): string | null {
  return entry.symptoms ?? entry.root_cause ?? entry.resolution ?? entry.lessons_learned ?? null;
}

// Private per account — this account's own institutional memory, never
// another account's (knowledge_vault_entries_select RLS), and not
// readable by platform admins either — see supabase/migrations/
// 0027_knowledge_vault.sql's own doc comment for why that boundary is
// deliberate, unlike the shared admin-managed Knowledge Base.
export default async function KnowledgeVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = (q ?? "").trim();
  const entries = query ? (await searchVault(supabase, query)).entries : await listVaultEntries(supabase);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm text-brand hover:underline">
              &larr; Back to projects
            </Link>
            <h1 className="mb-1 mt-4 text-2xl font-semibold">Knowledge Vault</h1>
            <p className="max-w-md text-sm text-muted">
              Your team&apos;s own lessons learned and incidents — private to this account, never
              shared with another QuePilot customer.
            </p>
          </div>
          <LinkButton href="/dashboard/knowledge-vault/new">New entry</LinkButton>
        </div>

        <form className="mb-6 flex gap-2" action="/dashboard/knowledge-vault">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search symptoms, root cause, resolution…"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <LinkButton href="/dashboard/knowledge-vault" variant="secondary" size="sm">
            Clear
          </LinkButton>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Search
          </button>
        </form>

        {entries.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              {query
                ? "No entries match that search."
                : "Nothing captured yet — add your first lesson learned or incident."}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link href={`/dashboard/knowledge-vault/${entry.id}`}>
                  <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{entry.title}</span>
                      <Badge tone={ENTRY_TYPE_TONE[entry.entry_type]}>
                        {ENTRY_TYPE_LABEL[entry.entry_type]}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      {entry.service_type && <Badge tone="brand">{SERVICE_LABELS[entry.service_type]}</Badge>}
                      {entry.tags.map((tag) => (
                        <span key={tag} className="text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {snippet(entry) && (
                      <p className="mt-2 truncate text-sm text-muted">{snippet(entry)}</p>
                    )}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
