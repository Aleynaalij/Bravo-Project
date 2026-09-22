"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject, setProjectServices, deleteProject, closeProject } from "@/lib/projects/service";
import { hasVaultEntryForProject } from "@/lib/vault/entries-service";
import { projectServicesSchema } from "@/lib/validation/project";
import { writeAuditLog } from "@/lib/audit/service";

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

  const project = await getProject(supabase, projectId);
  if (!project) return { error: "Project not found" };
  if (project.status === "closed") {
    return { error: "This project is closed and read-only — services in scope can't be changed." };
  }

  await setProjectServices(supabase, projectId, parsed.data.services);
  revalidatePath(`/dashboard/${projectId}`);

  return { savedAt: Date.now() };
}

// RLS (projects_all_own_account) scopes the delete to the caller's own
// account, so no separate ownership check is needed here — the same
// pattern deleteProject()'s other call sites would use. Cascades to
// project_services/deliverables/deliverable_versions/generation_jobs per
// the schema in supabase/migrations/0001_init.sql.
export async function deleteProjectAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");

  const supabase = await createClient();
  await deleteProject(supabase, projectId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export interface CloseProjectState {
  error?: string;
}

// The Knowledge Capture gate — a project can't close without at least one
// lesson-learned/incident vault entry linked to it (task #78's EKS V2
// brief: "no project should be closed without knowledge capture"). Closing
// makes the project read-only elsewhere (generate-actions.ts, the REST
// generate route, run.ts, and updateServicesAction above all check
// status === "closed").
export async function closeProjectAction(
  _prevState: CloseProjectState,
  formData: FormData,
): Promise<CloseProjectState> {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const hasCapture = await hasVaultEntryForProject(supabase, projectId);
  if (!hasCapture) {
    return {
      error:
        "Capture at least one Knowledge Vault entry (a lesson learned or incident) for this project before closing it.",
    };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  await closeProject(supabase, projectId);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "project.close",
    target: projectId,
  });
  revalidatePath(`/dashboard/${projectId}`);
  return {};
}
