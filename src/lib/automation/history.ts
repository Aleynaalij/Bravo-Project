import type { SupabaseClient } from "@supabase/supabase-js";
import type { CodeCreatorRequestInput, GeneratedScript } from "@/lib/validation/automation";

export interface AutomationRequestRow {
  id: string;
  input: string;
  output: GeneratedScript | null;
  error_message: string | null;
  created_at: string;
}

export type AutomationRequestStatus = "succeeded" | "failed" | "timed_out" | "processing";

// automation_requests has no status column — status is inferred from
// output/error_message nullity plus age. A request with both still null
// is genuinely ambiguous (still running vs. silently killed by the
// platform, the exact failure mode that prompted building this) — the
// only honest way to tell them apart is elapsed time. STILL_RUNNING_
// GRACE_SECONDS is set comfortably above every AI-generation route's
// maxDuration (120s as of this file) so a request that's actually still
// in flight is never mislabeled "timed out" out from under it.
const STILL_RUNNING_GRACE_SECONDS = 150;

export function getAutomationRequestStatus(
  row: Pick<AutomationRequestRow, "output" | "error_message" | "created_at">,
  now: Date = new Date(),
): AutomationRequestStatus {
  if (row.output) return "succeeded";
  if (row.error_message) return "failed";
  const elapsedSeconds = (now.getTime() - new Date(row.created_at).getTime()) / 1000;
  return elapsedSeconds >= STILL_RUNNING_GRACE_SECONDS ? "timed_out" : "processing";
}

const HISTORY_TITLE_MAX_LENGTH = 70;

// input is stored as JSON text (automation_requests.input), not jsonb —
// matches the shape runCodeCreator's own insert uses. Defensive parse:
// this is user-authored free text round-tripped through JSON.stringify,
// not something the schema guarantees is still well-formed years later.
export function parseCodeCreatorInput(input: string): CodeCreatorRequestInput | null {
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed?.description !== "string") return null;
    return parsed as CodeCreatorRequestInput;
  } catch {
    return null;
  }
}

export function historyItemTitle(description: string): string {
  const trimmed = description.trim();
  return trimmed.length > HISTORY_TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, HISTORY_TITLE_MAX_LENGTH - 1)}…`
    : trimmed;
}

const HISTORY_LIMIT = 15;

// Scoped to the calling account via RLS (automation_requests_select) —
// no explicit account_id filter needed, same as every other RLS-scoped
// list function in this codebase that takes the user-session client.
export async function listCodeCreatorHistory(supabase: SupabaseClient): Promise<AutomationRequestRow[]> {
  const { data, error } = await supabase
    .from("automation_requests")
    .select<string, AutomationRequestRow>("id, input, output, error_message, created_at")
    .eq("feature", "code_generate")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return data ?? [];
}
