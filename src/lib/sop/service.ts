import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { SopContent, SopInput, SopStatus, SopType } from "@/lib/validation/sop";
import { generateEmbedding } from "@/lib/ai/provider";

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

// Excludes `embedding` explicitly, same rationale as entries-service.ts's
// ENTRY_COLUMNS — nothing that reads a SopRow needs the raw 1536-float
// vector. Exported for src/lib/sop/search.ts's own text-filtered fallback
// query.
export const SOP_COLUMNS =
  "id, account_id, sop_type, title, service_type, status, content, prompt_template_version, " +
  "author_user_id, author_email, source_project_id, updated_at, version, created_at";

// Best-effort, not blocking — same contract as entries-service.ts's
// tryGenerateEmbedding: a SOP still saves with no embedding if no AI
// provider is configured or the call fails, it just isn't semantically
// searchable yet (search.ts falls back to text search).
async function tryGenerateEmbedding(input: SopInput): Promise<number[] | null> {
  const text = [input.title, ...input.content.sections.flatMap((s) => s.paragraphs)].join("\n\n");
  try {
    return await generateEmbedding(text);
  } catch {
    return null;
  }
}

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
  const embedding = await tryGenerateEmbedding(input);

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
      embedding,
    })
    .select<string, SopRow>(SOP_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSop(supabase: SupabaseClient, id: string, input: SopInput): Promise<SopRow> {
  const { data: existing } = await supabase.from("sops").select("version").eq("id", id).single();

  const embedding = await tryGenerateEmbedding(input);

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
      // Only overwrite with a new embedding if generation actually
      // succeeded — a failed regeneration leaves whatever embedding
      // already existed alone, same contract as entries-service.ts's
      // updateVaultEntry.
      ...(embedding ? { embedding } : {}),
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
