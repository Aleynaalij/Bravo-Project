"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { troubleshootRequestSchema, type TroubleshootResult } from "@/lib/validation/troubleshoot";
import { assertUnderEksRateLimit, EksRateLimitError } from "@/lib/eks/rate-limit";
import { runTroubleshoot, TroubleshootError } from "@/lib/eks/troubleshoot";
import { writeAuditLog } from "@/lib/audit/service";
import type { VaultEntryRow } from "@/lib/vault/entries-service";

export interface TroubleshootFormState {
  error?: string;
  result?: TroubleshootResult;
  similarIssues?: VaultEntryRow[];
}

export async function runTroubleshootAction(
  _prevState: TroubleshootFormState,
  formData: FormData,
): Promise<TroubleshootFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const serviceTypeRaw = String(formData.get("serviceType") ?? "");
  const projectIdRaw = String(formData.get("projectId") ?? "");
  const parsed = troubleshootRequestSchema.safeParse({
    problemStatement: String(formData.get("problemStatement") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    licensing: String(formData.get("licensing") ?? ""),
    symptoms: String(formData.get("symptoms") ?? ""),
    serviceType: serviceTypeRaw || null,
    projectId: projectIdRaw || null,
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
    await assertUnderEksRateLimit(supabase, accountId);
  } catch (err) {
    if (err instanceof EksRateLimitError) return { error: err.message };
    throw err;
  }

  try {
    const { result, similarIssues } = await runTroubleshoot(
      supabase,
      accountId,
      { id: user.id, email: user.email },
      parsed.data,
    );
    await writeAuditLog(supabase, {
      accountId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "eks.troubleshoot.run",
      metadata: { serviceType: parsed.data.serviceType, confidenceScore: result.confidenceScore },
    });
    return { result, similarIssues };
  } catch (err) {
    if (err instanceof TroubleshootError) return { error: err.message };
    throw err;
  }
}
