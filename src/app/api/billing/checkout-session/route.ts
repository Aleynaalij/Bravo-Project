import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getStripeClient, getPriceId, type BillingPlan } from "@/lib/billing/stripe";
import { ensureStripeCustomer } from "@/lib/billing/service";
import { countTeamMembers } from "@/lib/team/service";

const checkoutRequestSchema = z.object({
  plan: z.enum(["consultant", "professional"]),
});

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error.message },
      { status: 422 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ code: "unauthorized", message: "No account email" }, { status: 401 });
  }

  const plan: BillingPlan = parsed.data.plan;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripeClient();
    const customerId = await ensureStripeCustomer(stripe, accountId, user.email);
    // Checkout can happen after teammates are already on the account (an
    // owner subscribing partway through using a trial with a team already
    // invited) — bill for the seats that actually exist from day one
    // rather than starting at 1 and relying on the next invite/remove to
    // correct it.
    const quantity = await countTeamMembers(supabase, accountId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPriceId(plan), quantity: Math.max(quantity, 1) }],
      success_url: `${siteUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled`,
      metadata: { account_id: accountId, plan },
      subscription_data: { metadata: { account_id: accountId, plan } },
    });

    if (!session.url) {
      return NextResponse.json({ code: "stripe_error", message: "No checkout URL returned" }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout session creation failed";
    return NextResponse.json({ code: "stripe_error", message }, { status: 502 });
  }
}
