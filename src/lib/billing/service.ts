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
  quantity: number;
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
  quantity: number;
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
      quantity: params.quantity,
    },
    { onConflict: "account_id" },
  );

  await admin.from("accounts").update({ plan: params.plan }).eq("id", params.accountId);
}

// Pushes a new seat count to the subscription item's quantity so Stripe's
// bill (and its own proration) actually reflects team size — the seat cap
// in src/lib/billing/seats.ts is a separate, hard ceiling on top of this,
// not replaced by it. A no-op (not an error) when the account has no
// active Stripe subscription yet — nothing to sync to until they actually
// check out. Called best-effort from inviteTeamMemberAction/
// removeTeamMemberAction: a Stripe hiccup (or, in this environment,
// STRIPE_SECRET_KEY simply not being configured) shouldn't block adding or
// removing a teammate — that's a DB/RLS truth, billing is a downstream
// reflection of it, and a drift here is recoverable, whereas failing the
// team-management action itself over a billing API blip isn't a fair
// trade.
export async function syncSubscriptionQuantity(
  stripe: Stripe,
  accountId: string,
  quantity: number,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("account_id", accountId)
    .maybeSingle();

  const subscriptionId = data?.stripe_subscription_id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return;

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, quantity }],
    proration_behavior: "create_prorations",
  });

  // Reflect the new quantity locally right away rather than waiting on the
  // customer.subscription.updated webhook round trip — the Settings page
  // reads this table, not Stripe directly, and shouldn't show a stale
  // count between now and whenever that webhook lands.
  await admin.from("subscriptions").update({ quantity }).eq("account_id", accountId);
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
