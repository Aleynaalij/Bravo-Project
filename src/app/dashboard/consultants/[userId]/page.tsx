import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/team/service";
import { getConsultantContributions, searchConsultantKnowledge } from "@/lib/team/contributions";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { SOP_TYPE_LABELS } from "@/lib/validation/sop";
import { PLAYBOOK_TYPE_LABELS } from "@/lib/validation/playbook";
import type { ServiceType } from "@/lib/domain/enums";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";

const ENTRY_TYPE_TONE = { lesson_learned: "success", incident: "warning" } as const;
const ENTRY_TYPE_LABEL = { lesson_learned: "Lesson learned", incident: "Incident" } as const;

// "What would [teammate] do?" (Michael Mode), upgraded from a same-page
// filter (the author-<select> on the Knowledge Vault / SOPs / Playbooks
// list pages) into one dedicated view of everything a single teammate has
// captured, plus (below) the personal-memory query itself — "what would
// they say about X" — scoped search rather than just a browsable list.
export default async function ConsultantContributionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId } = await params;
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const teamMembers = await listTeamMembers(supabase, accountId);
  const consultant = teamMembers.find((m) => m.id === userId);
  if (!consultant) notFound();

  const query = (q ?? "").trim();
  const [contributions, knowledgeResults] = await Promise.all([
    getConsultantContributions(supabase, userId),
    query
      ? searchConsultantKnowledge(supabase, userId, query)
      : Promise.resolve({ playbooks: [], lessonsAndIncidents: [], scripts: [], sops: [] }),
  ]);

  const serviceCounts = new Map<ServiceType, number>();
  for (const row of [
    ...contributions.vaultEntries,
    ...contributions.scripts,
    ...contributions.sops,
    ...contributions.playbooks,
  ]) {
    if (!row.service_type) continue;
    serviceCounts.set(row.service_type, (serviceCounts.get(row.service_type) ?? 0) + 1);
  }
  const serviceRows = Array.from(serviceCounts.entries())
    .map(([serviceType, count]) => ({ label: SERVICE_LABELS[serviceType], value: count }))
    .sort((a, b) => b.value - a.value);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title={`What would ${consultant.email} do?`}
        description="Everything this teammate has captured across the Knowledge Vault, Script Vault, SOPs, and Playbooks."
      />

      <form className="mb-8 flex flex-wrap gap-2" action={`/dashboard/consultants/${userId}`}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={`What would ${consultant.email} say about…`}
          className="min-w-48 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Ask
        </button>
      </form>

      {query && (
        <div className="mb-10 flex flex-col gap-8">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Playbooks</h3>
            {knowledgeResults.playbooks.length === 0 ? (
              <p className="text-sm text-muted">Nothing of {consultant.email}&apos;s matches.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {knowledgeResults.playbooks.map((playbook) => (
                  <li key={playbook.id}>
                    <Link href={`/dashboard/playbooks/${playbook.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{playbook.title}</span>
                          <Badge tone="brand">{PLAYBOOK_TYPE_LABELS[playbook.playbook_type]}</Badge>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Lessons Learned &amp; Incidents</h3>
            {knowledgeResults.lessonsAndIncidents.length === 0 ? (
              <p className="text-sm text-muted">Nothing of {consultant.email}&apos;s matches.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {knowledgeResults.lessonsAndIncidents.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/dashboard/knowledge-vault/${entry.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{entry.title}</span>
                          <Badge tone={ENTRY_TYPE_TONE[entry.entry_type]}>{ENTRY_TYPE_LABEL[entry.entry_type]}</Badge>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Scripts</h3>
            {knowledgeResults.scripts.length === 0 ? (
              <p className="text-sm text-muted">Nothing of {consultant.email}&apos;s matches.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {knowledgeResults.scripts.map((script) => (
                  <li key={script.id}>
                    <Link href={`/dashboard/knowledge-vault/scripts/${script.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{script.name}</span>
                          <Badge tone="neutral">{script.script_type}</Badge>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">SOPs</h3>
            {knowledgeResults.sops.length === 0 ? (
              <p className="text-sm text-muted">Nothing of {consultant.email}&apos;s matches.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {knowledgeResults.sops.map((sop) => (
                  <li key={sop.id}>
                    <Link href={`/dashboard/sops/${sop.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{sop.title}</span>
                          <Badge tone="brand">{SOP_TYPE_LABELS[sop.sop_type]}</Badge>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-semibold">{contributions.vaultEntries.length}</p>
          <p className="text-xs text-muted">Lessons &amp; incidents</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{contributions.scripts.length}</p>
          <p className="text-xs text-muted">Scripts</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{contributions.sops.length}</p>
          <p className="text-xs text-muted">SOPs</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{contributions.playbooks.length}</p>
          <p className="text-xs text-muted">Playbooks</p>
        </Card>
      </div>

      {serviceRows.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Contributions by service</h2>
          <Card>
            <BarChart rows={serviceRows} />
          </Card>
        </>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Activity</h2>
      <Card className="flex flex-col gap-2 text-sm text-muted">
        <p>{contributions.eksRequestCount} Troubleshooting Engine / Architecture Advisor requests run.</p>
      </Card>
    </main>
  );
}
