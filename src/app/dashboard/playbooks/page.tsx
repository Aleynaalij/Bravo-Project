import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listPlaybooks } from "@/lib/playbook/service";
import { filterByAuthorId } from "@/lib/vault/search";
import { listTeamMembers } from "@/lib/team/service";
import { PLAYBOOK_TYPE_LABELS, PLAYBOOK_TYPES } from "@/lib/validation/playbook";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

// Private per account — a firm's own playbook library, same ownership/RLS
// boundary as SOPs/Knowledge Vault (playbooks_select RLS in migration
// 0033).
export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; author?: string }>;
}) {
  const { type, author } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const typeFilter = (type ?? "").trim() || null;
  const authorFilter = (author ?? "").trim() || null;

  const [rawPlaybooks, teamMembers] = await Promise.all([
    listPlaybooks(supabase),
    listTeamMembers(supabase, accountId),
  ]);
  const byType = typeFilter ? rawPlaybooks.filter((p) => p.playbook_type === typeFilter) : rawPlaybooks;
  const playbooks = filterByAuthorId(byType, authorFilter, (p) => p.author_user_id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Playbooks"
        description="Your team's own deployment and rollout playbooks — DLP deployment, records management, insider risk, and more."
        actions={<LinkButton href="/dashboard/playbooks/new">New playbook</LinkButton>}
      />

      <form className="mb-6 flex flex-wrap gap-2" action="/dashboard/playbooks">
        <select
          name="type"
          defaultValue={typeFilter ?? ""}
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Any type</option>
          {PLAYBOOK_TYPES.map((t) => (
            <option key={t} value={t}>
              {PLAYBOOK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
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
        <LinkButton href="/dashboard/playbooks" variant="secondary" size="sm">
          Clear
        </LinkButton>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Filter
        </button>
      </form>

      {playbooks.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {typeFilter || authorFilter ? "No playbooks match that filter." : "No playbooks yet — write your first one."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {playbooks.map((playbook) => (
            <li key={playbook.id}>
              <Link href={`/dashboard/playbooks/${playbook.id}`}>
                <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{playbook.title}</span>
                    <Badge tone={playbook.status === "published" ? "success" : "neutral"}>
                      {playbook.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Badge tone="brand">{PLAYBOOK_TYPE_LABELS[playbook.playbook_type]}</Badge>
                    {playbook.service_type && <Badge tone="neutral">{SERVICE_LABELS[playbook.service_type]}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {playbook.author_email} · v{playbook.version}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
