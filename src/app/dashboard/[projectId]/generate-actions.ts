"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAndRunJob } from "@/lib/generation/jobs";
import { generateRequestSchema } from "@/lib/validation/deliverable";

export interface GenerateFormState {
  error?: string;
  failedTypes?: string[];
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
  const failedTypes: string[] = [];

  for (const deliverableType of parsed.data.deliverableTypes) {
    const job = await createAndRunJob(supabase, projectId, deliverableType);
    if (job.status === "failed") {
      failedTypes.push(deliverableType);
    }
  }

  revalidatePath(`/dashboard/${projectId}`);

  return {
    completedAt: Date.now(),
    failedTypes: failedTypes.length > 0 ? failedTypes : undefined,
  };
}
