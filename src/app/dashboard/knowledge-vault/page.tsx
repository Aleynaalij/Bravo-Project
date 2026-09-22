import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listVaultEntries } from "@/lib/vault/entries-service";
import { searchVault, filterByAuthorId } from "@/lib/vault/search";
import { listTeamMembers } from "@/lib/team/service";
import { SERVICE_LABELS } from "@/lib/domain/labels";
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
  searchParams: Promise<{ q?: string; author?: string }>;
}) {
  const { q, author } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const query = (q ?? "").trim();
  const authorFilter = (author ?? "").trim() || null;

  const [rawEntries, teamMembers] = await Promise.all([
    query ? searchVault(supabase, query).then((r) => r.entries) : listVaultEntries(supabase),
    listTeamMembers(supabase, accountId),
  ]);
  const entries = filterByAuthorId(rawEntries, authorFilter, (entry) => entry.author_user_id);

  return (
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
        <div className="flex gap-2">
          <LinkButton href="/dashboard/knowledge-vault/scripts" variant="secondary">
            Scripts
          </LinkButton>
          <LinkButton href="/dashboard/knowledge-vault/new">New entry</LinkButton>
        </div>
      </div>

      <form className="mb-6 flex flex-wrap gap-2" action="/dashboard/knowledge-vault">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search symptoms, root cause, resolution…"
          className="min-w-48 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <select
          name="author"
          defaultValue={authorFilter ?? ""}
          title="What would this teammate do?"
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Any teammate</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
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
            {query || authorFilter
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
  );
}
