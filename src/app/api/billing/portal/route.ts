import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/billing/service";

// Not in the original docs/openapi.yaml — added alongside checkout-session
// since a "Manage billing" link (cancel, update card, view invoices) is
// the natural pair to it and Stripe's Customer Portal provides it with no
// extra UI to build.
export async function POST() {
  const supabase = await createClient();

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
    }
    throw err;
  }

  const subscription = await getSubscription(supabase, accountId);
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { code: "not_found", message: "No billing account yet — subscribe first" },
      { status: 404 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/billing`,
    });
    return NextResponse.json({ portalUrl: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe portal session creation failed";
    return NextResponse.json({ code: "stripe_error", message }, { status: 502 });
  }
}
