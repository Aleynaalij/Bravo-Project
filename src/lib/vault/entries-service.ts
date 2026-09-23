import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";
import type { VaultEntryInput, VaultEntryType, VaultSeverity } from "@/lib/validation/vault";
import { generateEmbedding } from "@/lib/ai/provider";

export interface VaultEntryRow {
  id: string;
  account_id: string;
  entry_type: VaultEntryType;
  title: string;
  service_type: ServiceType | null;
  industry: string | null;
  project_id: string | null;
  author_user_id: string | null;
  author_email: string;
  environment: string | null;
  symptoms: string | null;
  root_cause: string | null;
  troubleshooting_steps: string | null;
  resolution: string | null;
  validation_steps: string | null;
  preventative_controls: string | null;
  lessons_learned: string | null;
  impact: string | null;
  severity: VaultSeverity | null;
  escalation_path: string | null;
  time_to_resolution_minutes: number | null;
  confidence_score: number | null;
  source_url: string | null;
  tags: string[];
  customer_size: VaultEntryInput["customerSize"];
  version: number;
  updated_at: string;
  created_at: string;
}

// Excludes `embedding` explicitly, same rationale as
// src/lib/knowledge-base/service.ts's ENTRY_COLUMNS: nothing that reads a
// VaultEntryRow needs the raw 1536-float vector.
const ENTRY_COLUMNS =
  "id, account_id, entry_type, title, service_type, industry, project_id, " +
  "author_user_id, author_email, environment, symptoms, root_cause, " +
  "troubleshooting_steps, resolution, validation_steps, preventative_controls, " +
  "lessons_learned, impact, severity, escalation_path, time_to_resolution_minutes, " +
  "confidence_score, source_url, tags, customer_size, version, updated_at, created_at";

// RLS (knowledge_vault_entries_select) already scopes this to the caller's
// own account — same "the client passed in decides the scope" convention
// as src/lib/support/service.ts's listMySupportRequests.
//
// The explicit <string, VaultEntryRow> generic on every .select(ENTRY_COLUMNS)
// call below isn't decorative: postgrest-js infers a select's result by
// parsing the column-list string at the type level, and past a certain
// length that parser gives up and produces a useless generic-error type
// instead of the real row shape (every other .select() in this repo is
// short enough to never hit this; this 26-column list is the first one
// that does). Passing the row type explicitly bypasses that string
// parsing rather than fighting it.
export async function listVaultEntries(supabase: SupabaseClient): Promise<VaultEntryRow[]> {
  const { data, error } = await supabase
    .from("knowledge_vault_entries")
    .select<string, VaultEntryRow>(ENTRY_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// The Knowledge Capture gate for project closure (closeProjectAction, in
// [projectId]/actions.ts) — a project can't close until at least one
// lesson-learned/incident is linked to it. Lives here, not in
// projects/service.ts, since it's a vault-table read, not a projects-table
// concern.
export async function hasVaultEntryForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("knowledge_vault_entries")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getVaultEntry(supabase: SupabaseClient, id: string): Promise<VaultEntryRow | null> {
  const { data, error } = await supabase
    .from("knowledge_vault_entries")
    .select<string, VaultEntryRow>(ENTRY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Best-effort, not blocking — same contract as knowledge-base/service.ts's
// tryGenerateEmbedding: an entry still saves with no embedding if no AI
// provider is configured or the call fails, it just isn't semantically
// searchable yet (src/lib/vault/search.ts falls back to tag/text search).
async function tryGenerateEmbedding(input: VaultEntryInput): Promise<number[] | null> {
  const text = [input.title, input.symptoms, input.rootCause, input.resolution, input.lessonsLearned]
    .filter(Boolean)
    .join("\n\n");
  try {
    return await generateEmbedding(text);
  } catch {
    return null;
  }
}

export async function createVaultEntry(
  supabase: SupabaseClient,
  accountId: string,
  authorUserId: string,
  authorEmail: string,
  input: VaultEntryInput,
): Promise<VaultEntryRow> {
  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_vault_entries")
    .insert({
      account_id: accountId,
      author_user_id: authorUserId,
      author_email: authorEmail,
      entry_type: input.entryType,
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      project_id: input.projectId,
      environment: input.environment,
      symptoms: input.symptoms,
      root_cause: input.rootCause,
      troubleshooting_steps: input.troubleshootingSteps,
      resolution: input.resolution,
      validation_steps: input.validationSteps,
      preventative_controls: input.preventativeControls,
      lessons_learned: input.lessonsLearned,
      impact: input.impact,
      severity: input.severity,
      escalation_path: input.escalationPath,
      time_to_resolution_minutes: input.timeToResolutionMinutes,
      confidence_score: input.confidenceScore,
      source_url: input.sourceUrl,
      tags: input.tags,
      customer_size: input.customerSize,
      embedding,
    })
    .select<string, VaultEntryRow>(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateVaultEntry(
  supabase: SupabaseClient,
  id: string,
  input: VaultEntryInput,
): Promise<VaultEntryRow> {
  const { data: existing } = await supabase
    .from("knowledge_vault_entries")
    .select("version")
    .eq("id", id)
    .single();

  const embedding = await tryGenerateEmbedding(input);

  const { data, error } = await supabase
    .from("knowledge_vault_entries")
    .update({
      entry_type: input.entryType,
      title: input.title,
      service_type: input.serviceType,
      industry: input.industry,
      project_id: input.projectId,
      environment: input.environment,
      symptoms: input.symptoms,
      root_cause: input.rootCause,
      troubleshooting_steps: input.troubleshootingSteps,
      resolution: input.resolution,
      validation_steps: input.validationSteps,
      preventative_controls: input.preventativeControls,
      lessons_learned: input.lessonsLearned,
      impact: input.impact,
      severity: input.severity,
      escalation_path: input.escalationPath,
      time_to_resolution_minutes: input.timeToResolutionMinutes,
      confidence_score: input.confidenceScore,
      source_url: input.sourceUrl,
      tags: input.tags,
      customer_size: input.customerSize,
      version: (existing?.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
      // Only overwrite with a new embedding if generation actually
      // succeeded — a failed regeneration leaves whatever embedding
      // already existed alone, same contract as knowledge-base/service.ts.
      ...(embedding ? { embedding } : {}),
    })
    .eq("id", id)
    .select<string, VaultEntryRow>(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVaultEntry(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("knowledge_vault_entries").delete().eq("id", id);
  if (error) throw error;
}
