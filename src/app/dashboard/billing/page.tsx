import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getSubscription } from "@/lib/billing/service";
import { getTrialStatus } from "@/lib/billing/trial";
import { startCheckoutAction, openBillingPortalAction } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

const PLANS = [
  { id: "consultant" as const, name: "Consultant", price: "$49/mo" },
  { id: "professional" as const, name: "Professional", price: "$99/mo" },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const [subscription, userRow, trialStatus] = await Promise.all([
    getSubscription(supabase, accountId),
    supabase.from("users").select("role").eq("id", user.id).single(),
    getTrialStatus(supabase, accountId),
  ]);
  const isOwner = userRow.data?.role === "owner";
  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Billing"
        description="This account's QuePilot subscription — pick a plan below, or once subscribed, open the Stripe customer portal to update payment methods, seats, and invoices."
      />

      {checkout === "success" && (
        <Alert variant="success" className="mb-4">
          Subscription updated. It may take a few seconds to reflect below.
        </Alert>
      )}
      {checkout === "cancelled" && (
        <Alert variant="info" className="mb-4">
          Checkout cancelled — no changes made.
        </Alert>
      )}

      <p className="mb-6 flex items-center gap-2 text-sm text-muted">
        Current plan: <span className="font-medium text-foreground">{subscription?.plan ?? "trial"}</span>
        {subscription?.status && <Badge tone="brand">{subscription.status}</Badge>}
      </p>

      {!isOwner && (
        <Alert variant="info" className="mb-4">
          Only the account owner can manage billing.
        </Alert>
      )}

      {trialStatus && (
        <Alert
          variant={trialStatus.isTimeExpired || trialStatus.isGenerationLimitReached ? "warning" : "info"}
          className="mb-4"
        >
          {trialStatus.isTimeExpired
            ? "Your trial has ended. Subscribe below to keep generating deliverables — your existing projects and content aren't going anywhere."
            : trialStatus.isGenerationLimitReached
              ? `You've used all ${trialStatus.generationLimit} deliverable generations included in your trial. Subscribe below to keep generating.`
              : `${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? "" : "s"} left in your trial · ${trialStatus.generationsUsed} of ${trialStatus.generationLimit} generations used.`}
        </Alert>
      )}

      {hasActiveSubscription ? (
        isOwner && (
          <form action={openBillingPortalAction}>
            <Button type="submit">Manage billing</Button>
          </form>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {PLANS.map((plan) => (
            <Card key={plan.id}>
              <form
                action={startCheckoutAction}
                className="flex w-full flex-wrap items-center justify-between gap-3"
              >
                <input type="hidden" name="plan" value={plan.id} />
                <div>
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-sm text-muted">{plan.price}</div>
                </div>
                <Button type="submit" disabled={!isOwner}>
                  Subscribe
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
