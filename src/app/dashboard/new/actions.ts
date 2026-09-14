"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { createProject, setProjectServices } from "@/lib/projects/service";
import { projectCreateSchema, projectServicesSchema } from "@/lib/validation/project";

export interface IntakeFormState {
  error?: string;
}

// Returns state instead of redirecting on failure, so useActionState in the
// client form can show the error without a full page reload — a reload was
// wiping out everything the consultant had typed.
export async function createProjectAction(
  _prevState: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const supabase = await createClient();
  const accountId = await requireAccountId(supabase);

  const industryRaw = String(formData.get("industry") ?? "");
  const industry =
    industryRaw === "Other" ? String(formData.get("industryOther") ?? "").trim() : industryRaw;

  const licensingTierRaw = String(formData.get("licensingTier") ?? "");
  const licensingTier =
    licensingTierRaw === "Other"
      ? String(formData.get("licensingTierOther") ?? "").trim()
      : licensingTierRaw;

  const geographicLocations = String(formData.get("geographicLocations") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = projectCreateSchema.safeParse({
    customerName: String(formData.get("customerName") ?? ""),
    industry,
    userCount: Number(formData.get("userCount") ?? 0),
    licensingTier,
    geographicLocations,
    complianceNotes: String(formData.get("complianceNotes") ?? "") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  const services = formData.getAll("services").map(String);
  const parsedServices = projectServicesSchema.safeParse({ services });
  if (!parsedServices.success) {
    return { error: "Select at least one service in scope" };
  }

  const project = await createProject(supabase, accountId, parsed.data);
  await setProjectServices(supabase, project.id, parsedServices.data.services);

  redirect(`/dashboard/${project.id}`);
}
