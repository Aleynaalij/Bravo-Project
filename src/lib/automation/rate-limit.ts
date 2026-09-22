import type { SupabaseClient } from "@supabase/supabase-js";

// A separate ceiling from src/lib/generation/rate-limit.ts's deliverable-
// generation cap, per the confirmed design decision — Code Auditor/Code
// Creator are a different usage pattern (fast, single-call, no per-project
// batching) and shouldn't eat into a customer's deliverable-generation
// budget. Same flat, plan-independent abuse/cost-runaway rationale as that
// limiter, not a pricing decision.
const MAX_AUTOMATION_REQUESTS_PER_DAY = 50;

export class AutomationRateLimitError extends Error {
  constructor() {
    super(
      `This account has reached its limit of ${MAX_AUTOMATION_REQUESTS_PER_DAY} Automation Center requests in a 24-hour period. This is a safety limit against runaway usage, not a plan restriction — contact support if you have a legitimate need for more.`,
    );
    this.name = "AutomationRateLimitError";
  }
}

export async function assertUnderAutomationRateLimit(
  supabase: SupabaseClient,
  accountId: string,
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("automation_requests")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .gte("created_at", startOfDay.toISOString());

  if (error) throw error;
  if ((count ?? 0) >= MAX_AUTOMATION_REQUESTS_PER_DAY) {
    throw new AutomationRateLimitError();
  }
}
