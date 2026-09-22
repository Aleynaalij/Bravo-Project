"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import {
  codeCreatorRequestSchema,
  type CodeCreatorRequestInput,
  type GeneratedScript,
} from "@/lib/validation/automation";
import { vaultScriptSchema } from "@/lib/validation/vault";
import { assertUnderAutomationRateLimit, AutomationRateLimitError } from "@/lib/automation/rate-limit";
import { runCodeCreator, CodeCreatorError } from "@/lib/automation/creator";
import { createVaultScript } from "@/lib/vault/scripts-service";
import { writeAuditLog } from "@/lib/audit/service";

export interface CreatorActionResult {
  error?: string;
  result?: GeneratedScript;
}

// Called directly from the client step component (not a <form action>) —
// the two-step describe/requirements wizard already holds every field as
// typed local state by the time it's ready to generate, so routing it
// through FormData first would just be a lossy round trip. Every other
// Automation Center mutation in this build is a single flat form and uses
// the FormData + useActionState template instead; this is the one place
// that genuinely doesn't fit it, same reasoning mfa-section.tsx's
// Supabase-direct calls didn't try to force that template either.
export async function runCodeCreatorAction(input: CodeCreatorRequestInput): Promise<CreatorActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = codeCreatorRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the requirements for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  try {
    await assertUnderAutomationRateLimit(supabase, accountId);
  } catch (err) {
    if (err instanceof AutomationRateLimitError) return { error: err.message };
    throw err;
  }

  try {
    const { result } = await runCodeCreator(supabase, accountId, { id: user.id, email: user.email }, parsed.data);
    await writeAuditLog(supabase, {
      accountId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "automation.creator.generate",
      metadata: { scriptType: parsed.data.scriptType, environmentProfile: parsed.data.environmentProfile },
    });
    return { result };
  } catch (err) {
    if (err instanceof CodeCreatorError) return { error: err.message };
    throw err;
  }
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
