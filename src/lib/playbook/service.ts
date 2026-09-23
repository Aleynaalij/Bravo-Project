import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { PlaybookContent, PlaybookInput, PlaybookStatus, PlaybookType } from "@/lib/validation/playbook";

export interface PlaybookRow {
  id: string;
  account_id: string;
  playbook_type: PlaybookType;
  title: string;
  service_type: ServiceType | null;
  status: PlaybookStatus;
  content: PlaybookContent;
  prompt_template_version: string | null;
  author_user_id: string | null;
  author_email: string;
  source_project_id: string | null;
  updated_at: string;
  version: number;
  created_at: string;
}

// Exported for src/lib/playbook/search.ts's text-filtered search query.
export const PLAYBOOK_COLUMNS =
  "id, account_id, playbook_type, title, service_type, status, content, prompt_template_version, " +
  "author_user_id, author_email, source_project_id, updated_at, version, created_at";

// Explicit <string, PlaybookRow> generic on every .select(PLAYBOOK_COLUMNS)
// call below — same reason as sop/service.ts's SOP_COLUMNS: past a certain
// length postgrest-js's column-list parser gives up and produces a useless
// generic-error type instead of the real row shape.
export async function listPlaybooks(supabase: SupabaseClient): Promise<PlaybookRow[]> {
  const { data, error } = await supabase
    .from("playbooks")
    .select<string, PlaybookRow>(PLAYBOOK_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPlaybook(supabase: SupabaseClient, id: string): Promise<PlaybookRow | null> {
  const { data, error } = await supabase
    .from("playbooks")
    .select<string, PlaybookRow>(PLAYBOOK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPlaybook(
  supabase: SupabaseClient,
  accountId: string,
  authorUserId: string,
  authorEmail: string,
  input: PlaybookInput,
  sourceProjectId: string | null = null,
): Promise<PlaybookRow> {
  const { data, error } = await supabase
    .from("playbooks")
    .insert({
      account_id: accountId,
      author_user_id: authorUserId,
      author_email: authorEmail,
      playbook_type: input.playbookType,
      title: input.title,
      service_type: input.serviceType,
      status: input.status,
      content: input.content,
      source_project_id: sourceProjectId,
    })
    .select<string, PlaybookRow>(PLAYBOOK_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlaybook(
  supabase: SupabaseClient,
  id: string,
  input: PlaybookInput,
): Promise<PlaybookRow> {
  const { data: existing } = await supabase.from("playbooks").select("version").eq("id", id).single();

  const { data, error } = await supabase
    .from("playbooks")
    .update({
      playbook_type: input.playbookType,
      title: input.title,
      service_type: input.serviceType,
      status: input.status,
      content: input.content,
      version: (existing?.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select<string, PlaybookRow>(PLAYBOOK_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function publishPlaybook(supabase: SupabaseClient, id: string): Promise<PlaybookRow> {
  const { data, error } = await supabase
    .from("playbooks")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select<string, PlaybookRow>(PLAYBOOK_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlaybook(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("playbooks").delete().eq("id", id);
  if (error) throw error;
}

// Mirrors sop/service.ts's getSopVaultEntryLinks/setSopVaultEntryLinks
// exactly — the Playbook form's own "related vault entries" multi-select.
export async function getPlaybookVaultEntryLinks(supabase: SupabaseClient, playbookId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("playbook_vault_entry_links")
    .select("knowledge_vault_entry_id")
    .eq("playbook_id", playbookId);
  if (error) throw error;
  return (data ?? []).map((row) => row.knowledge_vault_entry_id as string);
}

export async function setPlaybookVaultEntryLinks(
  supabase: SupabaseClient,
  playbookId: string,
  vaultEntryIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("playbook_vault_entry_links")
    .delete()
    .eq("playbook_id", playbookId);
  if (deleteError) throw deleteError;
  if (vaultEntryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("playbook_vault_entry_links")
    .insert(vaultEntryIds.map((knowledge_vault_entry_id) => ({ playbook_id: playbookId, knowledge_vault_entry_id })));
  if (insertError) throw insertError;
}
