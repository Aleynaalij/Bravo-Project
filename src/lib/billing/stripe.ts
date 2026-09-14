import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}

export type BillingPlan = "consultant" | "professional";

// Stripe Price IDs — created in the Stripe Dashboard (Products & Prices),
// not something this app can provision itself. PRD §6.6: Consultant
// $49/mo, Professional $99/mo (FR-15).
export function getPriceId(plan: BillingPlan): string {
  const envVar = plan === "consultant" ? "STRIPE_PRICE_ID_CONSULTANT" : "STRIPE_PRICE_ID_PROFESSIONAL";
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} is not configured`);
  return priceId;
}

// Reverse lookup used by the webhook handler, which only has the Stripe
// price ID to work from, not our own plan enum.
export function planFromPriceId(priceId: string): BillingPlan | null {
  if (priceId === process.env.STRIPE_PRICE_ID_CONSULTANT) return "consultant";
  if (priceId === process.env.STRIPE_PRICE_ID_PROFESSIONAL) return "professional";
  return null;
}
