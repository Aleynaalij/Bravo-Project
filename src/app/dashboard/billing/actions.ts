"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountOwner } from "@/lib/auth/session";
import { getStripeClient, getPriceId, type BillingPlan } from "@/lib/billing/stripe";
import { ensureStripeCustomer, getSubscription } from "@/lib/billing/service";

// Billing management is owner-only now that an account can have more
// than one user (docs/PRD.md §11) — a teammate shouldn't be able to
// change or cancel the whole account's subscription. Both actions just
// no-op for a non-owner (requireAccountOwner throws, caught as a no-op)
// since the Billing page already hides these controls from non-owners —
// this is defense in depth against a submitted form bypassing the UI,
// not the primary gate.
export async function startCheckoutAction(formData: FormData) {
  const plan = String(formData.get("plan") ?? "") as BillingPlan;
  if (plan !== "consultant" && plan !== "professional") return;

  const supabase = await createClient();
  let accountId: string;
  try {
    ({ accountId } = await requireAccountOwner(supabase));
  } catch {
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(stripe, accountId, user.email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${siteUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled`,
    metadata: { account_id: accountId, plan },
    subscription_data: { metadata: { account_id: accountId, plan } },
  });

  if (session.url) redirect(session.url);
}

export async function openBillingPortalAction() {
  const supabase = await createClient();
  let accountId: string;
  try {
    ({ accountId } = await requireAccountOwner(supabase));
  } catch {
    return;
  }

  const subscription = await getSubscription(supabase, accountId);
  if (!subscription?.stripe_customer_id) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${siteUrl}/dashboard/billing`,
  });

  if (session.url) redirect(session.url);
}
