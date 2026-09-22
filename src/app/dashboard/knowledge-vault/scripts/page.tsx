import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listVaultScripts } from "@/lib/vault/scripts-service";
import { searchVault, filterByAuthorId } from "@/lib/vault/search";
import { listTeamMembers } from "@/lib/team/service";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

const RISK_TONE = { low: "success", medium: "warning", high: "error" } as const;

// Same private-per-account boundary as the parent Knowledge Vault (see
// supabase/migrations/0027_knowledge_vault.sql) — a reusable script
// library scoped to this account's own team, not shared platform-wide.
export default async function VaultScriptsPage({
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

  const [rawScripts, teamMembers] = await Promise.all([
    query ? searchVault(supabase, query).then((r) => r.scripts) : listVaultScripts(supabase),
    listTeamMembers(supabase, accountId),
  ]);
  const scripts = filterByAuthorId(rawScripts, authorFilter, (script) => script.author_user_id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/knowledge-vault" className="text-sm text-brand hover:underline">
              &larr; Back to Knowledge Vault
            </Link>
            <h1 className="mb-1 mt-4 text-2xl font-semibold">Scripts</h1>
            <p className="max-w-md text-sm text-muted">
              Your team&apos;s own reusable script library — PowerShell, Graph API, KQL, IaC.
            </p>
          </div>
          <LinkButton href="/dashboard/knowledge-vault/scripts/new">New script</LinkButton>
        </div>

        <form className="mb-6 flex flex-wrap gap-2" action="/dashboard/knowledge-vault/scripts">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search scripts…"
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
          <LinkButton href="/dashboard/knowledge-vault/scripts" variant="secondary" size="sm">
            Clear
          </LinkButton>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Search
          </button>
        </form>

        {scripts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              {query || authorFilter ? "No scripts match that search." : "Nothing saved yet — add your first script."}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {scripts.map((script) => (
              <li key={script.id}>
                <Link href={`/dashboard/knowledge-vault/scripts/${script.id}`}>
                  <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{script.name}</span>
                      <Badge tone={RISK_TONE[script.risk_level]}>{script.risk_level} risk</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <Badge tone="neutral">{script.script_type}</Badge>
                      {script.service_type && <Badge tone="brand">{SERVICE_LABELS[script.service_type]}</Badge>}
                      {script.tags.map((tag) => (
                        <span key={tag} className="text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 truncate text-sm text-muted">{script.description}</p>
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
