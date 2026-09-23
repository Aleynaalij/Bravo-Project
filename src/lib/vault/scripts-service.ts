import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { ScriptRiskLevel, ScriptType, VaultScriptInput, VaultScriptSource } from "@/lib/validation/vault";
import { generateEmbedding } from "@/lib/ai/provider";

export interface VaultScriptRow {
  id: string;
  account_id: string;
  name: string;
  description: string;
  script_type: ScriptType;
  service_type: ServiceType | null;
  content: string;
  risk_level: ScriptRiskLevel;
  dependencies: string | null;
  validation_steps: string | null;
  rollback_steps: string | null;
  author_user_id: string | null;
  author_email: string;
  tags: string[];
  version: number;
  updated_at: string;
  created_at: string;
  source: VaultScriptSource;
  is_approved_pattern: boolean;
}

// Excludes `embedding`, same rationale as entries-service.ts's ENTRY_COLUMNS.
const SCRIPT_COLUMNS =
  "id, account_id, name, description, script_type, service_type, content, " +
  "risk_level, dependencies, validation_steps, rollback_steps, author_user_id, " +
  "author_email, tags, version, updated_at, created_at, source, is_approved_pattern";

// See entries-service.ts's listVaultEntries comment: the explicit
// <string, VaultScriptRow> generic bypasses postgrest-js's type-level
// select-string parser, which gives up on a column list this long.
export async function listVaultScripts(supabase: SupabaseClient): Promise<VaultScriptRow[]> {
  const { data, error } = await supabase
    .from("knowledge_scripts")
    .select<string, VaultScriptRow>(SCRIPT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVaultScript(supabase: SupabaseClient, id: string): Promise<VaultScriptRow | null> {
  const { data, error } = await supabase
    .from("knowledge_scripts")
    .select<string, VaultScriptRow>(SCRIPT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Best-effort, not blocking — same contract as entries-service.ts.
async function tryGenerateEmbedding(input: VaultScriptInput): Promise<number[] | null> {
  try {
    return await generateEmbedding(`${input.name}\n\n${input.description}`);
  } catch {
    return null;
  }
}

export async function createVaultScript(
  supabase: SupabaseClient,
  accountId: string,
  authorUserId: string,
  authorEmail: string,
  input: VaultScriptInput,
  // Defaults to "manual" — the only other caller today is Code Creator's
  // "Promote to Script Vault" action, which passes "ai_generated" explicitly.
  source: VaultScriptSource = "manual",
): Promise<VaultScriptRow> {
  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_scripts")
    .insert({
      account_id: accountId,
      author_user_id: authorUserId,
      author_email: authorEmail,
      name: input.name,
      description: input.description,
      script_type: input.scriptType,
      service_type: input.serviceType,
      content: input.content,
      risk_level: input.riskLevel,
      dependencies: input.dependencies,
      validation_steps: input.validationSteps,
      rollback_steps: input.rollbackSteps,
      tags: input.tags,
      embedding,
      source,
      is_approved_pattern: input.isApprovedPattern,
    })
    .select<string, VaultScriptRow>(SCRIPT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateVaultScript(
  supabase: SupabaseClient,
  id: string,
  input: VaultScriptInput,
): Promise<VaultScriptRow> {
  const { data: existing } = await supabase
    .from("knowledge_scripts")
    .select("version")
    .eq("id", id)
    .single();

  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_scripts")
    .update({
      name: input.name,
      description: input.description,
      script_type: input.scriptType,
      service_type: input.serviceType,
      content: input.content,
      risk_level: input.riskLevel,
      dependencies: input.dependencies,
      validation_steps: input.validationSteps,
      rollback_steps: input.rollbackSteps,
      tags: input.tags,
      is_approved_pattern: input.isApprovedPattern,
      version: (existing?.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
      ...(embedding ? { embedding } : {}),
    })
    .eq("id", id)
    .select<string, VaultScriptRow>(SCRIPT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVaultScript(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("knowledge_scripts").delete().eq("id", id);
  if (error) throw error;
}

// The Script form's "related vault entries" multi-select — mirrors
// sop/service.ts's getSopVaultEntryLinks/setSopVaultEntryLinks exactly
// (migration 0038's script_vault_entry_links table).
export async function getScriptVaultEntryLinks(supabase: SupabaseClient, scriptId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("script_vault_entry_links")
    .select("knowledge_vault_entry_id")
    .eq("script_id", scriptId);
  if (error) throw error;
  return (data ?? []).map((row) => row.knowledge_vault_entry_id as string);
}

export async function setScriptVaultEntryLinks(
  supabase: SupabaseClient,
  scriptId: string,
  vaultEntryIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("script_vault_entry_links")
    .delete()
    .eq("script_id", scriptId);
  if (deleteError) throw deleteError;
  if (vaultEntryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("script_vault_entry_links")
    .insert(vaultEntryIds.map((knowledge_vault_entry_id) => ({ script_id: scriptId, knowledge_vault_entry_id })));
  if (insertError) throw insertError;
}
