import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableType } from "@/lib/domain/enums";
import { runGeneration, upsertDeliverable } from "./run";

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

// Enqueues a job (status defaults to 'queued' — see the generation_jobs
// table definition in supabase/migrations/0001_init.sql) and marks the
// deliverable "generating" right away, rather than waiting for whichever
// cron tick actually processes the job — the UI should show "in flight"
// the moment the request that created it returns, not up to a minute
// later.
export async function enqueueGenerationJob(
  supabase: SupabaseClient,
  projectId: string,
  deliverableType: DeliverableType,
): Promise<GenerationJobRow> {
  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({ project_id: projectId, deliverable_type: deliverableType, status: "queued" })
    .select("*")
    .single();
  if (error) throw error;

  await upsertDeliverable(supabase, projectId, deliverableType);

  return job;
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

async function runClaimedJobToCompletion(
  supabase: SupabaseClient,
  job: GenerationJobRow,
): Promise<GenerationJobRow> {
  try {
    const { deliverableId } = await runGeneration(supabase, job.project_id, job.deliverable_type);

    const { data: updated, error } = await supabase
      .from("generation_jobs")
      .update({
        status: "succeeded",
        result_deliverable_id: deliverableId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();
    if (error) throw error;
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

// Runs once a day now (see vercel.json and process-generation-jobs/
// route.ts for why — a Hobby-plan Vercel limitation, not a design
// choice), so a job can sit queued for up to ~24h before a tick even
// looks at it, and — because only MAX_JOBS_PER_TICK processes per tick —
// a queue deeper than this cap takes multiple *days* to fully drain, not
// multiple ticks a minute apart the way this cap originally assumed.
// Left at 5 rather than raised speculatively: the value that actually
// matters now is how long each job takes against a real AI provider
// (unmeasured — no provider key in this sandbox) versus the serverless
// function's execution-duration ceiling, and getting that wrong in the
// other direction (too high) risks the function itself timing out
// mid-batch. Revisit alongside upgrading off the Hobby plan.
const MAX_JOBS_PER_TICK = 5;

// Called from the cron route (src/app/api/cron/process-generation-jobs)
// with the admin (service-role) client — there's no user session behind a
// cron trigger, and a queued job's project could belong to any account,
// so this is deliberately not RLS-scoped the way a live request's queries
// are. claim_generation_jobs (migration 0021) atomically flips a batch of
// queued jobs to in_progress via `for update skip locked`, so two
// overlapping ticks can't both grab and double-process the same job.
export async function processQueuedGenerationJobs(
  supabase: SupabaseClient,
): Promise<GenerationJobRow[]> {
  const { data: claimed, error } = await supabase.rpc("claim_generation_jobs", {
    job_limit: MAX_JOBS_PER_TICK,
  });
  if (error) throw error;
  if (!claimed || claimed.length === 0) return [];

  const results: GenerationJobRow[] = [];
  for (const job of claimed as GenerationJobRow[]) {
    results.push(await runClaimedJobToCompletion(supabase, job));
  }
  return results;
}
