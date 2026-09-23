import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { searchKnowledge } from "@/lib/search/knowledge";
import { SOP_TYPE_LABELS } from "@/lib/validation/sop";
import { PLAYBOOK_TYPE_LABELS } from "@/lib/validation/playbook";
import { SERVICE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/domain/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

const ENTRY_TYPE_TONE = { lesson_learned: "success", incident: "warning" } as const;
const ENTRY_TYPE_LABEL = { lesson_learned: "Lesson learned", incident: "Incident" } as const;

// Historical Projects -> Playbooks -> Lessons Learned/Incidents -> Scripts
// -> SOPs -> Microsoft Docs (the original Module 10 brief's ranking) — six
// separate ranked sections, never blended into one feed. The first five
// share the same per-type list-item markup already established on their
// own list pages; Microsoft Docs is the one external, non-account-owned
// source, so it ranks last and gets its own card shape (external link,
// snippet, no internal route).
export default async function SearchPage({
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
  const results = query
    ? await searchKnowledge(supabase, query)
    : { historicalProjects: [], playbooks: [], lessonsAndIncidents: [], scripts: [], sops: [], microsoftDocs: [] };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Search"
        description="Search across your team's Historical Projects, Playbooks, Knowledge Vault, Scripts, SOPs, and Microsoft Docs — real institutional knowledge, ranked separately by type."
      />

      <form className="mb-8 flex flex-wrap gap-2" action="/dashboard/search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search everything…"
          autoFocus
          className="min-w-48 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Search
        </button>
      </form>

      {!query && (
        <Card>
          <p className="text-sm text-muted">Type something above to search across every content type.</p>
        </Card>
      )}

      {query && (
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Historical Projects</h2>
            {results.historicalProjects.length === 0 ? (
              <p className="text-sm text-muted">No matching projects.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.historicalProjects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/dashboard/${project.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{project.customer_name}</span>
                          <Badge tone={project.status === "closed" ? "neutral" : "success"}>
                            {PROJECT_STATUS_LABELS[project.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="brand">{project.industry}</Badge>
                          {project.services.map((service) => (
                            <Badge key={service} tone="neutral">
                              {SERVICE_LABELS[service]}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Playbooks</h2>
            {results.playbooks.length === 0 ? (
              <p className="text-sm text-muted">No matching playbooks.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.playbooks.map((playbook) => (
                  <li key={playbook.id}>
                    <Link href={`/dashboard/playbooks/${playbook.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{playbook.title}</span>
                          <Badge tone="brand">{PLAYBOOK_TYPE_LABELS[playbook.playbook_type]}</Badge>
                        </div>
                        {playbook.service_type && (
                          <Badge tone="neutral">{SERVICE_LABELS[playbook.service_type]}</Badge>
                        )}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Lessons Learned &amp; Incidents</h2>
            {results.lessonsAndIncidents.length === 0 ? (
              <p className="text-sm text-muted">No matching entries.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.lessonsAndIncidents.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/dashboard/knowledge-vault/${entry.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{entry.title}</span>
                          <Badge tone={ENTRY_TYPE_TONE[entry.entry_type]}>
                            {ENTRY_TYPE_LABEL[entry.entry_type]}
                          </Badge>
                        </div>
                        {entry.service_type && <Badge tone="brand">{SERVICE_LABELS[entry.service_type]}</Badge>}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Scripts</h2>
            {results.scripts.length === 0 ? (
              <p className="text-sm text-muted">No matching scripts.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.scripts.map((script) => (
                  <li key={script.id}>
                    <Link href={`/dashboard/knowledge-vault/scripts/${script.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{script.name}</span>
                          <Badge tone="neutral">{script.script_type}</Badge>
                        </div>
                        {script.is_approved_pattern && <Badge tone="success">Approved Pattern</Badge>}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">SOPs</h2>
            {results.sops.length === 0 ? (
              <p className="text-sm text-muted">No matching SOPs.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.sops.map((sop) => (
                  <li key={sop.id}>
                    <Link href={`/dashboard/sops/${sop.id}`}>
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{sop.title}</span>
                          <Badge tone="brand">{SOP_TYPE_LABELS[sop.sop_type]}</Badge>
                        </div>
                        {sop.service_type && <Badge tone="neutral">{SERVICE_LABELS[sop.service_type]}</Badge>}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Microsoft Docs</h2>
            {results.microsoftDocs === null ? (
              <p className="text-sm text-muted">
                Microsoft Docs search is unavailable right now — try again in a moment.
              </p>
            ) : results.microsoftDocs.length === 0 ? (
              <p className="text-sm text-muted">No matching Microsoft Docs articles.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.microsoftDocs.map((doc) => (
                  <li key={doc.url}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Card className="transition-colors hover:border-brand hover:bg-surface-hover">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{doc.title}</span>
                          <Badge tone="neutral">learn.microsoft.com</Badge>
                        </div>
                        {doc.snippet && <p className="text-sm text-muted">{doc.snippet}</p>}
                      </Card>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
