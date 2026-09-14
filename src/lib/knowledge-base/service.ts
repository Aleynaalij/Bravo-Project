import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { KnowledgeBaseEntryInput } from "@/lib/validation/knowledge-base";

export interface KnowledgeBaseEntryRow {
  id: string;
  title: string;
  service_type: ServiceType;
  industry: string | null;
  content: string;
  source_url: string | null;
  version: number;
  created_at: string;
}

export async function listKnowledgeBaseEntries(
  supabase: SupabaseClient,
): Promise<KnowledgeBaseEntryRow[]> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select("*")
    .order("service_type")
    .order("industry", { nullsFirst: true });
  if (error) throw error;
  return data ?? [];
}

export async function getKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<KnowledgeBaseEntryRow | null> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createKnowledgeBaseEntry(
  supabase: SupabaseClient,
  input: KnowledgeBaseEntryInput,
): Promise<KnowledgeBaseEntryRow> {
  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .insert({
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      content: input.content,
      source_url: input.sourceUrl,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
  input: KnowledgeBaseEntryInput,
): Promise<KnowledgeBaseEntryRow> {
  const { data: existing } = await supabase
    .from("knowledge_base_entries")
    .select("version")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("knowledge_base_entries")
    .update({
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      content: input.content,
      source_url: input.sourceUrl,
      version: (existing?.version ?? 1) + 1,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKnowledgeBaseEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("knowledge_base_entries").delete().eq("id", id);
  if (error) throw error;
}
