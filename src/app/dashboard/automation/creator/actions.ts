"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { vaultScriptSchema } from "@/lib/validation/vault";
import { createVaultScript } from "@/lib/vault/scripts-service";
import { writeAuditLog } from "@/lib/audit/service";

// Generation itself no longer runs through a Server Action — the
// chalkboard view needs a real streamed response, which Server Actions
// don't give a client (see src/app/api/automation/creator/stream/
// route.ts and creator-form.tsx's submitRequest). What's left here is
// everything that isn't generation: deleting a history row and promoting
// a finished script to the Script Vault.

// Plain FormData action (DeleteProjectButton's own shape) — deletes one
// history row. RLS (automation_requests_delete, migration 0043) already
// scopes this to the caller's own account; the explicit account_id filter
// here is defense in depth, matching this codebase's convention elsewhere.
export async function deleteCodeCreatorRequestAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("requestId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const accountId = await requireAccountId(supabase);

  await supabase.from("automation_requests").delete().eq("id", requestId).eq("account_id", accountId);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "automation.creator.delete_request",
    target: requestId,
  });

  revalidatePath("/dashboard/automation/creator");
}

export interface PromoteFormState {
  error?: string;
}

// Standard FormData + useActionState template (unlike runCodeCreatorAction
// above) — this is a plain "create a record" mutation once the user has a
// generated script in hand, same shape as every other create action in
// this codebase.
export async function promoteGeneratedScriptAction(
  _prevState: PromoteFormState,
  formData: FormData,
): Promise<PromoteFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = vaultScriptSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    scriptType: String(formData.get("scriptType") ?? ""),
    serviceType: null,
    content: String(formData.get("content") ?? ""),
    riskLevel: "medium",
    dependencies: String(formData.get("dependencies") ?? ""),
    validationSteps: "",
    rollbackSteps: String(formData.get("rollbackSteps") ?? ""),
    tags: [],
    isApprovedPattern: formData.get("isApprovedPattern") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Give the script a name before saving it." };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const script = await createVaultScript(supabase, accountId, user.id, user.email, parsed.data, "ai_generated");
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "automation.script.promote",
    target: script.id,
    metadata: { scriptType: script.script_type, isApprovedPattern: script.is_approved_pattern },
  });
  revalidatePath("/dashboard/knowledge-vault/scripts");
  redirect(`/dashboard/knowledge-vault/scripts/${script.id}`);
}
