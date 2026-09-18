import type { SupabaseClient } from "@supabase/supabase-js";

// Cross-account plan/subscription distribution — platform-operator data,
// same trust boundary as src/lib/metrics/usage.ts (admin/service-role
// client only, gated by requirePlatformAdmin at the /admin layout level).
//
// Reads accounts.plan for the plan breakdown, not subscriptions.plan —
// accounts.plan is set for every account from the moment it's created
// (supabase/migrations/0003_auth_trigger.sql), while a subscriptions row
// only exists once an account has actually gone through Stripe checkout
// (docs/ERD.md: "subscriptions is the source of truth for billing state"
// — but only for accounts that have billing state yet). Reading
// subscriptions.plan here would silently undercount every trial account
// that's never touched Stripe.
//
// Deliberately no MRR/ARR figure: that needs each price's real dollar
// amount, which lives in Stripe's own dashboard (this project treats the
// Stripe price IDs as opaque env vars, per docs/PRD.md §6.6 — "a human
// needs to set real ones") and no Stripe API key is configured in this
// environment to fetch it. Showing a dollar figure without a real price
// behind it would be fabricating data, which this project doesn't do —
// see docs/validation-checklist.md's rename entry for the same principle
// applied elsewhere.
export interface PlanDistribution {
  accountsByPlan: { plan: string; count: number }[];
  totalAccounts: number;
  subscriptionsByStatus: { status: string; count: number }[];
  totalSeatsBilled: number;
  accountsWithNoSubscriptionRow: number;
}

export async function getPlanDistribution(admin: SupabaseClient): Promise<PlanDistribution> {
  const [accountsResult, subscriptionsResult] = await Promise.all([
    admin.from("accounts").select("id, plan"),
    admin.from("subscriptions").select("account_id, status, quantity"),
  ]);
  if (accountsResult.error) throw accountsResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;

  const accounts = accountsResult.data ?? [];
  const planCounts = new Map<string, number>();
  for (const row of accounts) {
    planCounts.set(row.plan, (planCounts.get(row.plan) ?? 0) + 1);
  }
  const accountsByPlan = Array.from(planCounts.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  const subscriptions = subscriptionsResult.data ?? [];
  const statusCounts = new Map<string, number>();
  let totalSeatsBilled = 0;
  for (const row of subscriptions) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    totalSeatsBilled += row.quantity ?? 0;
  }
  const subscriptionsByStatus = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    accountsByPlan,
    totalAccounts: accounts.length,
    subscriptionsByStatus,
    totalSeatsBilled,
    accountsWithNoSubscriptionRow: accounts.length - subscriptions.length,
  };
}
