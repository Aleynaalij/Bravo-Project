"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setProjectServices } from "@/lib/projects/service";
import { projectServicesSchema } from "@/lib/validation/project";

export interface ServicesFormState {
  error?: string;
  savedAt?: number;
}

export async function updateServicesAction(
  _prevState: ServicesFormState,
  formData: FormData,
): Promise<ServicesFormState> {
  const projectId = String(formData.get("projectId") ?? "");
  const services = formData.getAll("services").map(String);

  const parsed = projectServicesSchema.safeParse({ services });
  if (!parsed.success) {
    // Services in scope drive deliverable generation (PRD FR-4), so an
    // empty selection is rejected rather than silently clearing scope.
    return { error: "Select at least one service in scope" };
  }

  const supabase = await createClient();
  await setProjectServices(supabase, projectId, parsed.data.services);
  revalidatePath(`/dashboard/${projectId}`);

  return { savedAt: Date.now() };
}
