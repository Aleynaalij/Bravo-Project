import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScriptType } from "@/lib/validation/vault";
import type { CodingStandardInput } from "@/lib/validation/automation";

export interface CodingStandardRow {
  id: string;
  account_id: string;
  script_type: ScriptType;
  required_elements: string[];
  notes: string | null;
  author_user_id: string | null;
  author_email: string;
  version: number;
  created_at: string;
}

const STANDARD_COLUMNS =
  "id, account_id, script_type, required_elements, notes, author_user_id, author_email, version, created_at";

export async function listCodingStandards(supabase: SupabaseClient): Promise<CodingStandardRow[]> {
  const { data, error } = await supabase
    .from("coding_standards")
    .select(STANDARD_COLUMNS)
    .order("script_type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CodingStandardRow[];
}

export async function getCodingStandard(supabase: SupabaseClient, id: string): Promise<CodingStandardRow | null> {
  const { data, error } = await supabase
    .from("coding_standards")
    .select(STANDARD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CodingStandardRow | null;
}

// Used by Code Auditor/Code Creator's prompt assembly to find "does this
// account have a standard for the script type in play" — returns null
// (not an error) when the account hasn't defined one yet, since grading/
// generating without an account-specific standard is a valid fallback
// state, not a failure.
export async function getCodingStandardByScriptType(
  supabase: SupabaseClient,
  scriptType: ScriptType,
): Promise<CodingStandardRow | null> {
  const { data, error } = await supabase
    .from("coding_standards")
    .select(STANDARD_COLUMNS)
    .eq("script_type", scriptType)
    .maybeSingle();
  if (error) throw error;
  return data as CodingStandardRow | null;
}

export async function createCodingStandard(
  supabase: SupabaseClient,
  accountId: string,
  authorUserId: string,
  authorEmail: string,
  input: CodingStandardInput,
): Promise<CodingStandardRow> {
  const { data, error } = await supabase
    .from("coding_standards")
    .insert({
      account_id: accountId,
      author_user_id: authorUserId,
      author_email: authorEmail,
      script_type: input.scriptType,
      required_elements: input.requiredElements,
      notes: input.notes,
    })
    .select(STANDARD_COLUMNS)
    .single();
  if (error) throw error;
  return data as CodingStandardRow;
}

export async function updateCodingStandard(
  supabase: SupabaseClient,
  id: string,
  input: CodingStandardInput,
): Promise<CodingStandardRow> {
  const { data: existing } = await supabase.from("coding_standards").select("version").eq("id", id).single();

  const { data, error } = await supabase
    .from("coding_standards")
    .update({
      script_type: input.scriptType,
      required_elements: input.requiredElements,
      notes: input.notes,
      version: (existing?.version ?? 1) + 1,
    })
    .eq("id", id)
    .select(STANDARD_COLUMNS)
    .single();
  if (error) throw error;
  return data as CodingStandardRow;
}

export async function deleteCodingStandard(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("coding_standards").delete().eq("id", id);
  if (error) throw error;
}
