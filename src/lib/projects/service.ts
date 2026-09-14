import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/lib/validation/project";

// Shared data-access layer for projects, used by both the Route Handlers
// (docs/openapi.yaml surface) and Server Actions backing the UI forms, so
// the two never drift on validation or query shape.

export interface ProjectRow {
  id: string;
  account_id: string;
  customer_name: string;
  industry: string;
  user_count: number;
  licensing_tier: string;
  geographic_locations: string[];
  compliance_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithServices extends ProjectRow {
  services: ServiceType[];
}

async function getServicesForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from("project_services")
    .select("service_type")
    .eq("project_id", projectId);

  if (error) throw error;
  return (data ?? []).map((row) => row.service_type as ServiceType);
}

export async function listProjects(
  supabase: SupabaseClient,
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectWithServices | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const services = await getServicesForProject(supabase, projectId);
  return { ...data, services };
}

export async function createProject(
  supabase: SupabaseClient,
  accountId: string,
  input: ProjectCreateInput,
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      account_id: accountId,
      customer_name: input.customerName,
      industry: input.industry,
      user_count: input.userCount,
      licensing_tier: input.licensingTier,
      geographic_locations: input.geographicLocations ?? [],
      compliance_notes: input.complianceNotes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  input: ProjectUpdateInput,
): Promise<ProjectRow> {
  const patch: Record<string, unknown> = {};
  if (input.customerName !== undefined) patch.customer_name = input.customerName;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.userCount !== undefined) patch.user_count = input.userCount;
  if (input.licensingTier !== undefined) patch.licensing_tier = input.licensingTier;
  if (input.geographicLocations !== undefined)
    patch.geographic_locations = input.geographicLocations;
  if (input.complianceNotes !== undefined)
    patch.compliance_notes = input.complianceNotes;

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function setProjectServices(
  supabase: SupabaseClient,
  projectId: string,
  services: ServiceType[],
): Promise<ServiceType[]> {
  const { error: deleteError } = await supabase
    .from("project_services")
    .delete()
    .eq("project_id", projectId);
  if (deleteError) throw deleteError;

  if (services.length === 0) return [];

  const { error: insertError } = await supabase
    .from("project_services")
    .insert(services.map((service_type) => ({ project_id: projectId, service_type })));
  if (insertError) throw insertError;

  return services;
}
