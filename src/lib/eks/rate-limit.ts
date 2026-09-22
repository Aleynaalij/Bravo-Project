import type { SupabaseClient } from "@supabase/supabase-js";

// Own ceiling, separate from automation/rate-limit.ts's — EKS reasoning
// calls (Troubleshooting Engine, Architecture Advisor) are a structurally
// different usage pattern from Automation Center's, per eks_requests'
// own migration doc comment, and shouldn't eat into that budget or
// deliverable generation's.
const MAX_EKS_REQUESTS_PER_DAY = 50;

export class EksRateLimitError extends Error {
  constructor() {
    super(
      `This account has reached its limit of ${MAX_EKS_REQUESTS_PER_DAY} Expert Knowledge System requests in a 24-hour period. This is a safety limit against runaway usage, not a plan restriction — contact support if you have a legitimate need for more.`,
    );
    this.name = "EksRateLimitError";
  }
}

export async function assertUnderEksRateLimit(supabase: SupabaseClient, accountId: string): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("eks_requests")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .gte("created_at", startOfDay.toISOString());

  if (error) throw error;
  if ((count ?? 0) >= MAX_EKS_REQUESTS_PER_DAY) {
    throw new EksRateLimitError();
  }
}
