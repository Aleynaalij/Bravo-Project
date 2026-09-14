"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAndRunJob } from "@/lib/generation/jobs";
import { generateRequestSchema } from "@/lib/validation/deliverable";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";

export interface GenerateFormState {
  error?: string;
  failedResults?: { deliverableType: string; errorMessage: string }[];
  completedAt?: number;
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
  const failedResults: { deliverableType: string; errorMessage: string }[] = [];

  for (const deliverableType of parsed.data.deliverableTypes) {
    const job = await createAndRunJob(supabase, projectId, deliverableType);
    if (job.status === "failed") {
      failedResults.push({
        deliverableType: DELIVERABLE_LABELS[deliverableType] ?? deliverableType,
        // Surfaced directly in the UI so a failure can be diagnosed from
        // what the consultant sees on screen, without needing separate
        // access to server/runtime logs.
        errorMessage: job.error_message ?? "Unknown error",
      });
    }
  }

  revalidatePath(`/dashboard/${projectId}`);

  return {
    completedAt: Date.now(),
    failedResults: failedResults.length > 0 ? failedResults : undefined,
  };
}
