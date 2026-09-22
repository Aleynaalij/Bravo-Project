"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { vaultScriptSchema, normalizeTags } from "@/lib/validation/vault";
import { createVaultScript, deleteVaultScript, updateVaultScript } from "@/lib/vault/scripts-service";
import { writeAuditLog } from "@/lib/audit/service";

export interface ScriptFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return vaultScriptSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    scriptType: String(formData.get("scriptType") ?? ""),
    serviceType: String(formData.get("serviceType") ?? "") || null,
    content: String(formData.get("content") ?? ""),
    riskLevel: String(formData.get("riskLevel") ?? "medium"),
    dependencies: String(formData.get("dependencies") ?? ""),
    validationSteps: String(formData.get("validationSteps") ?? ""),
    rollbackSteps: String(formData.get("rollbackSteps") ?? ""),
    tags: normalizeTags(String(formData.get("tags") ?? "")),
    isApprovedPattern: formData.get("isApprovedPattern") === "on",
  });
}

export async function createVaultScriptAction(
  _prevState: ScriptFormState,
  formData: FormData,
): Promise<ScriptFormState> {
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

  const script = await createVaultScript(supabase, accountId, user.id, user.email, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.script.create",
    target: script.id,
    metadata: { name: script.name, scriptType: script.script_type },
  });
  revalidatePath("/dashboard/knowledge-vault/scripts");
  redirect(`/dashboard/knowledge-vault/scripts/${script.id}`);
}

export async function updateVaultScriptAction(
  _prevState: ScriptFormState,
  formData: FormData,
): Promise<ScriptFormState> {
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

  const script = await updateVaultScript(supabase, id, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.script.update",
    target: script.id,
    metadata: { name: script.name, scriptType: script.script_type, version: script.version },
  });
  revalidatePath("/dashboard/knowledge-vault/scripts");
  redirect(`/dashboard/knowledge-vault/scripts/${script.id}`);
}

export async function deleteVaultScriptAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deleteVaultScript(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.script.delete",
    target: id,
  });
  revalidatePath("/dashboard/knowledge-vault/scripts");
  redirect("/dashboard/knowledge-vault/scripts");
}
