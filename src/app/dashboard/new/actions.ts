"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { createProject, setProjectServices } from "@/lib/projects/service";
import { projectCreateSchema, projectServicesSchema } from "@/lib/validation/project";

export async function createProjectAction(formData: FormData) {
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
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input");
    redirect(`/dashboard/new?error=${message}`);
  }

  const services = formData.getAll("services").map(String);
  const parsedServices = projectServicesSchema.safeParse({ services });
  if (!parsedServices.success) {
    redirect(`/dashboard/new?error=${encodeURIComponent("Select at least one service in scope")}`);
  }

  const project = await createProject(supabase, accountId, parsed.data);
  await setProjectServices(supabase, project.id, parsedServices.data.services);

  redirect(`/dashboard/${project.id}`);
}
