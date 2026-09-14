import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableType } from "@/lib/domain/enums";
import { runGeneration } from "./run";

export interface GenerationJobRow {
  id: string;
  project_id: string;
  deliverable_type: DeliverableType;
  status: "queued" | "in_progress" | "succeeded" | "failed";
  result_deliverable_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// Creates a generation_jobs row and runs generation synchronously (see
// runGeneration's docstring on why this is fine for MVP scale), updating
// the job's status/result as it goes so the row is always an accurate
// audit trail even though there's no separate worker yet.
export async function createAndRunJob(
  supabase: SupabaseClient,
  projectId: string,
  deliverableType: DeliverableType,
): Promise<GenerationJobRow> {
  const { data: job, error: insertError } = await supabase
    .from("generation_jobs")
    .insert({ project_id: projectId, deliverable_type: deliverableType, status: "in_progress" })
    .select("*")
    .single();
  if (insertError) throw insertError;

  try {
    const { deliverableId } = await runGeneration(supabase, projectId, deliverableType);

    const { data: updated, error: updateError } = await supabase
      .from("generation_jobs")
      .update({
        status: "succeeded",
        result_deliverable_id: deliverableId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const { data: updated } = await supabase
      .from("generation_jobs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", job.id)
      .select("*")
      .single();
    return updated ?? { ...job, status: "failed", error_message: message };
  }
}

export async function getJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<GenerationJobRow | null> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
