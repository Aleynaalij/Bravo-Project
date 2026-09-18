import type { SupabaseClient } from "@supabase/supabase-js";

// Bounds a trial account so evaluating the product has a real endpoint
// that pushes toward a paid subscription, instead of "trial" being a
// permanently-usable free tier in practice. This is deliberately distinct
// from FR-16's deferred plan-tiered numeric limits (docs/PRD.md §9,
// "holding off until there's real usage data") — FR-16 is about sizing
// consultant-vs-professional access levels correctly, which genuinely
// needs usage data this project doesn't have yet. A trial cap doesn't
// need that data to be worth shipping: the point of a trial is that it
// ends, not that its ceiling is perfectly calibrated. Same
// placeholder-business-decision status as SEAT_LIMITS
// (src/lib/billing/seats.ts) — a human should revisit these numbers
// against real conversion data, but a bounded trial beats an unbounded
// one while waiting for that conversation.
export const TRIAL_DAYS = 14;
export const TRIAL_GENERATION_LIMIT = 20;

export class TrialExpiredError extends Error {
  constructor() {
    super(
      `Your ${TRIAL_DAYS}-day trial has ended. Upgrade to keep generating deliverables — your existing projects and content aren't going anywhere.`,
    );
    this.name = "TrialExpiredError";
  }
}

export class TrialGenerationLimitError extends Error {
  constructor() {
    super(
      `Your trial includes ${TRIAL_GENERATION_LIMIT} deliverable generations. Upgrade to keep generating — your existing projects and content aren't going anywhere.`,
    );
    this.name = "TrialGenerationLimitError";
  }
}

// Ceils rather than floors so "created 30 minutes ago" reads as
// TRIAL_DAYS remaining, not TRIAL_DAYS - 1 — a trial that visibly loses a
// day the moment someone signs up reads as a bug, not a feature.
export function trialDaysRemaining(accountCreatedAt: string, now: Date = new Date()): number {
  const createdAt = new Date(accountCreatedAt);
  const elapsedDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
}

export function isTrialTimeExpired(accountCreatedAt: string, now: Date = new Date()): boolean {
  return trialDaysRemaining(accountCreatedAt, now) <= 0;
}

export interface TrialStatus {
  daysRemaining: number;
  isTimeExpired: boolean;
  generationsUsed: number;
  generationLimit: number;
  isGenerationLimitReached: boolean;
}

// Returns null for a non-trial account (paid or unrecognized plan) —
// callers use that to decide whether to show trial UI at all, same
// "null means not applicable" convention as getSubscription.
export async function getTrialStatus(
  supabase: SupabaseClient,
  accountId: string,
): Promise<TrialStatus | null> {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("plan, created_at")
    .eq("id", accountId)
    .single();
  if (accountError) throw accountError;
  if (account.plan !== "trial") return null;

  const { count, error: countError } = await supabase
    .from("generation_jobs")
    .select("id, projects!inner(account_id)", { count: "exact", head: true })
    .eq("projects.account_id", accountId);
  if (countError) throw countError;

  const generationsUsed = count ?? 0;
  return {
    daysRemaining: trialDaysRemaining(account.created_at),
    isTimeExpired: isTrialTimeExpired(account.created_at),
    generationsUsed,
    generationLimit: TRIAL_GENERATION_LIMIT,
    isGenerationLimitReached: generationsUsed >= TRIAL_GENERATION_LIMIT,
  };
}

// Checked alongside assertUnderGenerationRateLimit at every generation
// entry point (the Server Action and the REST route) — same shape, same
// call site, a different guardrail (trial bounds vs. abuse ceiling).
// No-ops immediately for a paid account.
export async function assertTrialNotExhausted(
  supabase: SupabaseClient,
  accountId: string,
): Promise<void> {
  const status = await getTrialStatus(supabase, accountId);
  if (!status) return;
  if (status.isTimeExpired) throw new TrialExpiredError();
  if (status.isGenerationLimitReached) throw new TrialGenerationLimitError();
}
