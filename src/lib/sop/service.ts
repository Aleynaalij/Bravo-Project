import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { SopContent, SopInput, SopStatus, SopType } from "@/lib/validation/sop";

export interface SopRow {
  id: string;
  account_id: string;
  sop_type: SopType;
  title: string;
  service_type: ServiceType | null;
  status: SopStatus;
  content: SopContent;
  prompt_template_version: string | null;
  author_user_id: string | null;
  author_email: string;
  source_project_id: string | null;
  updated_at: string;
  version: number;
  created_at: string;
}

const SOP_COLUMNS =
  "id, account_id, sop_type, title, service_type, status, content, prompt_template_version, " +
  "author_user_id, author_email, source_project_id, updated_at, version, created_at";

// Explicit <string, SopRow> generic on every .select(SOP_COLUMNS) call below
// — same reason as entries-service.ts's ENTRY_COLUMNS: past a certain
// length postgrest-js's column-list parser gives up and produces a useless
// generic-error type instead of the real row shape.
export async function listSops(supabase: SupabaseClient): Promise<SopRow[]> {
  const { data, error } = await supabase
    .from("sops")
    .select<string, SopRow>(SOP_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSop(supabase: SupabaseClient, id: string): Promise<SopRow | null> {
  const { data, error } = await supabase
    .from("sops")
    .select<string, SopRow>(SOP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSop(
  supabase: SupabaseClient,
  accountId: string,
  authorUserId: string,
  authorEmail: string,
  input: SopInput,
  sourceProjectId: string | null = null,
): Promise<SopRow> {
  const { data, error } = await supabase
    .from("sops")
    .insert({
      account_id: accountId,
      author_user_id: authorUserId,
      author_email: authorEmail,
      sop_type: input.sopType,
      title: input.title,
      service_type: input.serviceType,
      status: input.status,
      content: input.content,
      source_project_id: sourceProjectId,
    })
    .select<string, SopRow>(SOP_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSop(supabase: SupabaseClient, id: string, input: SopInput): Promise<SopRow> {
  const { data: existing } = await supabase.from("sops").select("version").eq("id", id).single();

  const { data, error } = await supabase
    .from("sops")
    .update({
      sop_type: input.sopType,
      title: input.title,
      service_type: input.serviceType,
      status: input.status,
      content: input.content,
      version: (existing?.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select<string, SopRow>(SOP_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function publishSop(supabase: SupabaseClient, id: string): Promise<SopRow> {
  const { data, error } = await supabase
    .from("sops")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select<string, SopRow>(SOP_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSop(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("sops").delete().eq("id", id);
  if (error) throw error;
}
