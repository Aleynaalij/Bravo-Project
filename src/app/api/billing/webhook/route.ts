import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, planFromPriceId } from "@/lib/billing/stripe";
import { getAccountIdForStripeCustomer, upsertSubscriptionFromStripe } from "@/lib/billing/service";

// No auth — Stripe calls this directly. Authenticity comes from verifying
// the signature against STRIPE_WEBHOOK_SECRET, not a session.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ code: "not_configured", message: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ code: "invalid_signature", message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        // Other event types aren't relevant to subscription state yet.
        break;
    }
  } catch (err) {
    // Stripe retries on non-2xx, so a transient DB error here is recoverable
    // — return 500 rather than swallowing it silently.
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ code: "webhook_error", message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const accountId =
    subscription.metadata?.account_id ||
    (await getAccountIdForStripeCustomer(subscription.customer as string));

  if (!accountId) {
    throw new Error(`No account_id found for Stripe customer ${subscription.customer}`);
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = (priceId && planFromPriceId(priceId)) || "trial";
  const periodEndSeconds = subscription.items.data[0]?.current_period_end;

  await upsertSubscriptionFromStripe({
    accountId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    plan,
    currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
  });
}
