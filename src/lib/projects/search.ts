import type { SupabaseClient } from "@supabase/supabase-js";
import { rankByTextMatch } from "@/lib/vault/search";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { listProjectsWithServices, type ProjectWithServices } from "./service";

// Text-filtered only, no embeddings — same fallback-only shape as
// searchPlaybooks. A project's profile is fixed fields (industry,
// licensing tier, compliance notes, services in scope), not the kind of
// free-form narrative prose an embedding earns its keep on.
export async function searchProjects(supabase: SupabaseClient, query: string): Promise<ProjectWithServices[]> {
  if (!query.trim()) return [];
  const projects = await listProjectsWithServices(supabase);
  return rankByTextMatch(projects, query, (project) =>
    [
      project.customer_name,
      project.industry,
      project.licensing_tier,
      project.compliance_notes,
      ...project.geographic_locations,
      ...project.services.map((s) => SERVICE_LABELS[s]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}
