"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { codingStandardSchema, normalizeRequiredElements } from "@/lib/validation/automation";
import { createCodingStandard, deleteCodingStandard, updateCodingStandard } from "@/lib/automation/standards-service";
import { writeAuditLog } from "@/lib/audit/service";

export interface StandardFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return codingStandardSchema.safeParse({
    scriptType: String(formData.get("scriptType") ?? ""),
    requiredElements: normalizeRequiredElements(String(formData.get("requiredElements") ?? "")),
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function createCodingStandardAction(
  _prevState: StandardFormState,
  formData: FormData,
): Promise<StandardFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  let standard;
  try {
    standard = await createCodingStandard(supabase, accountId, user.id, user.email, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return { error: "This account already has a standard for that script type — edit it instead of creating a new one." };
    }
    throw err;
  }
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "automation.standard.create",
    target: standard.id,
    metadata: { scriptType: standard.script_type },
  });
  revalidatePath("/dashboard/automation/standards");
  redirect(`/dashboard/automation/standards/${standard.id}`);
}

export async function updateCodingStandardAction(
  _prevState: StandardFormState,
  formData: FormData,
): Promise<StandardFormState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const standard = await updateCodingStandard(supabase, id, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "automation.standard.update",
    target: standard.id,
    metadata: { scriptType: standard.script_type, version: standard.version },
  });
  revalidatePath("/dashboard/automation/standards");
  redirect(`/dashboard/automation/standards/${standard.id}`);
}

export async function deleteCodingStandardAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deleteCodingStandard(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "automation.standard.delete",
    target: id,
  });
  revalidatePath("/dashboard/automation/standards");
  redirect("/dashboard/automation/standards");
}
