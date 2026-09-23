"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { architectureAdvisorRequestSchema, type ArchitectureAdvisorResult } from "@/lib/validation/architecture-advisor";
import { assertUnderEksRateLimit, EksRateLimitError } from "@/lib/eks/rate-limit";
import { runArchitectureAdvisor, ArchitectureAdvisorError } from "@/lib/eks/architecture-advisor";
import { writeAuditLog } from "@/lib/audit/service";

export interface ArchitectureAdvisorFormState {
  error?: string;
  result?: ArchitectureAdvisorResult;
}

export async function runArchitectureAdvisorAction(
  _prevState: ArchitectureAdvisorFormState,
  formData: FormData,
): Promise<ArchitectureAdvisorFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const projectIdRaw = String(formData.get("projectId") ?? "");
  const parsed = architectureAdvisorRequestSchema.safeParse({
    industry: String(formData.get("industry") ?? ""),
    userCount: String(formData.get("userCount") ?? ""),
    licensingTier: String(formData.get("licensingTier") ?? ""),
    complianceRequirements: String(formData.get("complianceRequirements") ?? ""),
    securityRequirements: String(formData.get("securityRequirements") ?? ""),
    businessGoals: String(formData.get("businessGoals") ?? ""),
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
    const { result } = await runArchitectureAdvisor(supabase, accountId, { id: user.id, email: user.email }, parsed.data);
    await writeAuditLog(supabase, {
      accountId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "eks.architecture_advisor.run",
      metadata: { industry: parsed.data.industry, recommendedServiceCount: result.recommendedServices.length },
    });
    return { result };
  } catch (err) {
    if (err instanceof ArchitectureAdvisorError) return { error: err.message };
    throw err;
  }
}
