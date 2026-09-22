import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listSops } from "@/lib/sop/service";
import { filterByAuthorId } from "@/lib/vault/search";
import { listTeamMembers } from "@/lib/team/service";
import { SOP_TYPE_LABELS, SOP_TYPES } from "@/lib/validation/sop";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

// Private per account — a firm's own SOP library, same ownership/RLS
// boundary as Knowledge Vault (sops_select RLS in migration 0032).
export default async function SopsPage({
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

  const [rawSops, teamMembers] = await Promise.all([listSops(supabase), listTeamMembers(supabase, accountId)]);
  const byType = typeFilter ? rawSops.filter((s) => s.sop_type === typeFilter) : rawSops;
  const sops = filterByAuthorId(byType, authorFilter, (sop) => sop.author_user_id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="SOPs"
        description="Your team's own standard operating procedures — daily operations, DLP administration, label management, and more."
        actions={<LinkButton href="/dashboard/sops/new">New SOP</LinkButton>}
      />

      <form className="mb-6 flex flex-wrap gap-2" action="/dashboard/sops">
        <select
          name="type"
          defaultValue={typeFilter ?? ""}
          className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Any type</option>
          {SOP_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOP_TYPE_LABELS[t]}
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
        <LinkButton href="/dashboard/sops" variant="secondary" size="sm">
          Clear
        </LinkButton>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Filter
        </button>
      </form>

      {sops.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {typeFilter || authorFilter ? "No SOPs match that filter." : "No SOPs yet — write your first one."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {sops.map((sop) => (
            <li key={sop.id}>
              <Link href={`/dashboard/sops/${sop.id}`}>
                <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{sop.title}</span>
                    <Badge tone={sop.status === "published" ? "success" : "neutral"}>
                      {sop.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Badge tone="brand">{SOP_TYPE_LABELS[sop.sop_type]}</Badge>
                    {sop.service_type && <Badge tone="neutral">{SERVICE_LABELS[sop.service_type]}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {sop.author_email} · v{sop.version}
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
