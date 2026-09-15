import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableType } from "@/lib/domain/enums";

export interface VaultEntry {
  deliverableId: string;
  type: DeliverableType;
  versionNumber: number;
  generatedAt: string;
}

export interface VaultProjectGroup {
  projectId: string;
  customerName: string;
  entries: VaultEntry[];
}

export interface RecentDeliverable extends VaultEntry {
  projectId: string;
  customerName: string;
}

// The vault doesn't store its own copy of generated files — every DOCX/
// PDF/PPTX is still built on demand from deliverable_versions.content (see
// docs/TDD.md §2.6 on why exports are cheap to regenerate rather than
// persisted to Storage). What was actually missing was a single place to
// browse everything ever generated across every project, instead of only
// being able to see a project's deliverables by opening that project.
export async function listVaultEntries(supabase: SupabaseClient): Promise<VaultProjectGroup[]> {
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, customer_name")
    .order("created_at", { ascending: false });
  if (projectsError) throw projectsError;
  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const { data: deliverables, error: deliverablesError } = await supabase
    .from("deliverables")
    .select("id, project_id, type, current_version_id")
    .in("project_id", projectIds)
    .eq("status", "ready")
    .not("current_version_id", "is", null);
  if (deliverablesError) throw deliverablesError;
  if (!deliverables || deliverables.length === 0) return [];

  const versionIds = deliverables.map((d) => d.current_version_id as string);
  const { data: versions, error: versionsError } = await supabase
    .from("deliverable_versions")
    .select("id, version_number, created_at")
    .in("id", versionIds);
  if (versionsError) throw versionsError;

  const versionsById = new Map((versions ?? []).map((v) => [v.id, v]));
  const entriesByProject = new Map<string, VaultEntry[]>();

  for (const d of deliverables) {
    const version = versionsById.get(d.current_version_id as string);
    if (!version) continue;

    const entry: VaultEntry = {
      deliverableId: d.id,
      type: d.type,
      versionNumber: version.version_number,
      generatedAt: version.created_at,
    };
    const list = entriesByProject.get(d.project_id) ?? [];
    list.push(entry);
    entriesByProject.set(d.project_id, list);
  }

  return projects
    .filter((p) => entriesByProject.has(p.id))
    .map((p) => ({
      projectId: p.id,
      customerName: p.customer_name,
      entries: entriesByProject.get(p.id)!.sort((a, b) => a.type.localeCompare(b.type)),
    }));
}

// Powers the dashboard's "Recent activity" widget — the most recently
// generated deliverables across every project, flattened out of the same
// grouped data listVaultEntries already computes rather than a second
// query shape, since account-level deliverable counts are small enough
// that sorting the already-fetched list is simpler than a bespoke query.
export async function listRecentDeliverables(
  supabase: SupabaseClient,
  limit = 5,
): Promise<RecentDeliverable[]> {
  const groups = await listVaultEntries(supabase);

  const flat: RecentDeliverable[] = groups.flatMap((group) =>
    group.entries.map((entry) => ({
      ...entry,
      projectId: group.projectId,
      customerName: group.customerName,
    })),
  );

  return flat
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, limit);
}
