import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan } from "./stripe";

export interface SubscriptionRow {
  account_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan: string;
  current_period_end: string | null;
}

export async function getSubscription(
  supabase: SupabaseClient,
  accountId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Ensures the account has a Stripe customer, creating one and persisting
// stripe_customer_id if this is the account's first checkout. Uses the
// admin client since subscriptions is read-only for the account under RLS
// (docs/ERD.md) — writes only ever happen server-side, here and in the
// webhook handler.
export async function ensureStripeCustomer(
  stripe: Stripe,
  accountId: string,
  accountEmail: string,
): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: accountEmail,
    metadata: { account_id: accountId },
  });

  await admin
    .from("subscriptions")
    .upsert({ account_id: accountId, stripe_customer_id: customer.id }, { onConflict: "account_id" });

  return customer.id;
}

// Called from the webhook handler (no user session — must use the admin
// client). Keeps subscriptions as the source of truth and accounts.plan in
// sync as a denormalized read-shortcut, per docs/ERD.md's note on accounts.
export async function upsertSubscriptionFromStripe(params: {
  accountId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  plan: BillingPlan | "trial";
  currentPeriodEnd: string | null;
}): Promise<void> {
  const admin = createAdminClient();

  await admin.from("subscriptions").upsert(
    {
      account_id: params.accountId,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      status: params.status,
      plan: params.plan,
      current_period_end: params.currentPeriodEnd,
    },
    { onConflict: "account_id" },
  );

  await admin.from("accounts").update({ plan: params.plan }).eq("id", params.accountId);
}

export async function getAccountIdForStripeCustomer(
  stripeCustomerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("account_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return data?.account_id ?? null;
}
