"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { codeAuditRequestSchema, type CodeAuditResult } from "@/lib/validation/automation";
import { assertUnderAutomationRateLimit, AutomationRateLimitError } from "@/lib/automation/rate-limit";
import { runCodeAudit, CodeAuditError } from "@/lib/automation/audit";
import { writeAuditLog } from "@/lib/audit/service";

export interface AuditFormState {
  error?: string;
  result?: CodeAuditResult;
}

export async function runCodeAuditAction(
  _prevState: AuditFormState,
  formData: FormData,
): Promise<AuditFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = codeAuditRequestSchema.safeParse({
    scriptType: String(formData.get("scriptType") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
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

  try {
    await assertUnderAutomationRateLimit(supabase, accountId);
  } catch (err) {
    if (err instanceof AutomationRateLimitError) return { error: err.message };
    throw err;
  }

  try {
    const { result } = await runCodeAudit(supabase, accountId, { id: user.id, email: user.email }, parsed.data);
    await writeAuditLog(supabase, {
      accountId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "automation.audit.run",
      metadata: { scriptType: parsed.data.scriptType, overallScore: result.scoreCard.overall },
    });
    return { result };
  } catch (err) {
    if (err instanceof CodeAuditError) return { error: err.message };
    throw err;
  }
}
