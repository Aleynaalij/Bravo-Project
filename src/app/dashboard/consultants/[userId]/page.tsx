import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/team/service";
import { getConsultantContributions } from "@/lib/team/contributions";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import type { ServiceType } from "@/lib/domain/enums";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";

// "What would [teammate] do?" (Michael Mode), upgraded from a same-page
// filter (the author-<select> on the Knowledge Vault / SOPs / Playbooks
// list pages) into one dedicated view of everything a single teammate has
// captured across every content type this account has.
export default async function ConsultantContributionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const teamMembers = await listTeamMembers(supabase, accountId);
  const consultant = teamMembers.find((m) => m.id === userId);
  if (!consultant) notFound();

  const contributions = await getConsultantContributions(supabase, userId);

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
