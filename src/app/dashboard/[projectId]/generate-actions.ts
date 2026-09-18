"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccountId } from "@/lib/auth/session";
import { enqueueGenerationJob, drainGenerationQueue } from "@/lib/generation/jobs";
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

  // Runs after this response is sent — starts draining the queue this
  // request just added to immediately, instead of leaving these jobs to
  // sit until the next once-a-day cron tick (see drainGenerationQueue's
  // doc comment in jobs.ts). Uses the admin client since queue processing
  // is deliberately not RLS-scoped, same as the cron route.
  after(async () => {
    try {
      await drainGenerationQueue(createAdminClient());
    } catch (err) {
      console.error("[generation] Immediate queue drain failed:", err);
    }
  });

  return { jobIds, enqueuedAt: Date.now() };
}
