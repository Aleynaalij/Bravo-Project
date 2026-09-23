import type { SupabaseClient } from "@supabase/supabase-js";

// Own ceiling, separate from eks_requests'/automation_requests' — Que is
// meant to be the primary day-to-day interaction surface (it's on the
// dashboard home page), not an occasional deep-dive tool like the
// Troubleshooting Engine, so it gets a more generous daily budget than
// those 50/day limits. Still a safety cap against runaway usage, not a
// plan restriction.
const MAX_ASSISTANT_MESSAGES_PER_DAY = 150;

export class AssistantRateLimitError extends Error {
  constructor() {
    super(
      `This account has reached its limit of ${MAX_ASSISTANT_MESSAGES_PER_DAY} Que messages in a 24-hour period. This is a safety limit against runaway usage, not a plan restriction — contact support if you have a legitimate need for more.`,
    );
    this.name = "AssistantRateLimitError";
  }
}

export async function assertUnderAssistantRateLimit(supabase: SupabaseClient, accountId: string): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("assistant_messages")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("role", "user")
    .gte("created_at", startOfDay.toISOString());

  if (error) throw error;
  if ((count ?? 0) >= MAX_ASSISTANT_MESSAGES_PER_DAY) {
    throw new AssistantRateLimitError();
  }
}
