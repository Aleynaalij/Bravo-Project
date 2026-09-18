"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { enqueueGenerationJob } from "@/lib/generation/jobs";
import { assertUnderGenerationRateLimit, GenerationRateLimitError } from "@/lib/generation/rate-limit";
import {
  assertTrialNotExhausted,
  TrialExpiredError,
  TrialGenerationLimitError,
} from "@/lib/billing/trial";
import { generateRequestSchema } from "@/lib/validation/deliverable";

export interface GenerateFormState {
  error?: string;
  jobIds?: string[];
  enqueuedAt?: number;
}

export async function generateDeliverablesAction(
  _prevState: GenerateFormState,
  formData: FormData,
): Promise<GenerateFormState> {
  const projectId = String(formData.get("projectId") ?? "");
  const deliverableTypes = formData.getAll("deliverableTypes").map(String);

  const parsed = generateRequestSchema.safeParse({ deliverableTypes });
  if (!parsed.success) {
    return { error: "Select at least one deliverable to generate" };
  }

  const supabase = await createClient();

  try {
    const accountId = await requireAccountId(supabase);
    await assertUnderGenerationRateLimit(supabase, accountId);
    await assertTrialNotExhausted(supabase, accountId);
  } catch (err) {
    if (err instanceof GenerationRateLimitError) return { error: err.message };
    if (err instanceof TrialExpiredError || err instanceof TrialGenerationLimitError) {
      return { error: err.message };
    }
    throw err;
  }

  // Enqueues and returns immediately — actual generation happens in the
  // background (see src/lib/generation/jobs.ts and the cron route that
  // processes the queue). The client polls /api/generation-jobs/[id] for
  // each returned id and refreshes the page once they're all done; there's
  // nothing to revalidate here yet, since none of them have run.
  const jobIds: string[] = [];
  for (const deliverableType of parsed.data.deliverableTypes) {
    const job = await enqueueGenerationJob(supabase, projectId, deliverableType);
    jobIds.push(job.id);
  }

  return { jobIds, enqueuedAt: Date.now() };
}
