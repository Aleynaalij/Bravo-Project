import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";

export interface DeliverableWithContent {
  id: string;
  type: DeliverableType;
  status: "pending" | "generating" | "ready" | "failed";
  content: DeliverableContent | null;
  versionNumber: number | null;
}

// Fetches each deliverable for a project along with its current version's
// content, for display on the project detail page.
export async function listDeliverablesWithContent(
  supabase: SupabaseClient,
  projectId: string,
): Promise<DeliverableWithContent[]> {
  const { data: deliverables, error } = await supabase
    .from("deliverables")
    .select("id, type, status, current_version_id")
    .eq("project_id", projectId);
  if (error) throw error;
  if (!deliverables || deliverables.length === 0) return [];

  const versionIds = deliverables.map((d) => d.current_version_id).filter(Boolean) as string[];
  const versionsById = new Map<string, { content: DeliverableContent; version_number: number }>();

  if (versionIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from("deliverable_versions")
      .select("id, content, version_number")
      .in("id", versionIds);
    if (versionsError) throw versionsError;
    for (const v of versions ?? []) {
      versionsById.set(v.id, { content: v.content, version_number: v.version_number });
    }
  }

  return deliverables.map((d) => {
    const version = d.current_version_id ? versionsById.get(d.current_version_id) : undefined;
    return {
      id: d.id,
      type: d.type,
      status: d.status,
      content: version?.content ?? null,
      versionNumber: version?.version_number ?? null,
    };
  });
}

export async function getDeliverableWithContent(
  supabase: SupabaseClient,
  deliverableId: string,
): Promise<DeliverableWithContent | null> {
  const { data: deliverable, error } = await supabase
    .from("deliverables")
    .select("id, type, status, current_version_id")
    .eq("id", deliverableId)
    .maybeSingle();
  if (error) throw error;
  if (!deliverable) return null;

  if (!deliverable.current_version_id) {
    return { id: deliverable.id, type: deliverable.type, status: deliverable.status, content: null, versionNumber: null };
  }

  const { data: version, error: versionError } = await supabase
    .from("deliverable_versions")
    .select("content, version_number")
    .eq("id", deliverable.current_version_id)
    .maybeSingle();
  if (versionError) throw versionError;

  return {
    id: deliverable.id,
    type: deliverable.type,
    status: deliverable.status,
    content: version?.content ?? null,
    versionNumber: version?.version_number ?? null,
  };
}
