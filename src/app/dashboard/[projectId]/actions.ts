"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setProjectServices } from "@/lib/projects/service";
import { projectServicesSchema } from "@/lib/validation/project";

export async function updateServicesAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const services = formData.getAll("services").map(String);

  const parsed = projectServicesSchema.safeParse({ services });
  if (!parsed.success) {
    // Services in scope drive deliverable generation (PRD FR-4), so an
    // empty selection is rejected rather than silently clearing scope.
    return;
  }

  const supabase = await createClient();
  await setProjectServices(supabase, projectId, parsed.data.services);
  revalidatePath(`/dashboard/${projectId}`);
}
