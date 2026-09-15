import type { SupabaseClient } from "@supabase/supabase-js";

// A flat abuse/cost-runaway guardrail, not a plan-tiered usage limit — FR-16
// (numeric limits per plan, docs/PRD.md §9) is a deliberate, documented
// deferral pending real usage data, and this isn't reversing that decision.
// This exists purely so a compromised account, a scripting error, or
// someone reflexively selecting the full deliverable catalog in a loop
// can't turn into an unbounded, unnoticed OpenAI/Azure OpenAI bill — same
// ceiling for every account regardless of plan. Checked once per action
// call rather than per deliverable within a batch, so a single legitimate
// submission near the ceiling can land slightly over it (bounded by
// whatever's selected in one submission, at most the size of the
// deliverable catalog) — what this actually stops is unbounded *repeated*
// calls, which is the real threat.
const MAX_GENERATIONS_PER_DAY = 50;

export class GenerationRateLimitError extends Error {
  constructor() {
    super(
      `This account has reached its limit of ${MAX_GENERATIONS_PER_DAY} generations in a 24-hour period. This is a safety limit against runaway usage, not a plan restriction — contact support if you have a legitimate need for more.`,
    );
    this.name = "GenerationRateLimitError";
  }
}

export async function assertUnderGenerationRateLimit(
  supabase: SupabaseClient,
  accountId: string,
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("generation_jobs")
    .select("id, projects!inner(account_id)", { count: "exact", head: true })
    .eq("projects.account_id", accountId)
    .gte("created_at", startOfDay.toISOString());

  if (error) throw error;
  if ((count ?? 0) >= MAX_GENERATIONS_PER_DAY) {
    throw new GenerationRateLimitError();
  }
}
