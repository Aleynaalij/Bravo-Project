import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getSubscription } from "@/lib/billing/service";
import { startCheckoutAction, openBillingPortalAction } from "./actions";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  const subscription = await getSubscription(supabase, accountId);
  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold">Billing</h1>

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

        {hasActiveSubscription ? (
          <form action={openBillingPortalAction}>
            <Button type="submit">Manage billing</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {PLANS.map((plan) => (
              <Card key={plan.id} className="flex items-center justify-between">
                <form action={startCheckoutAction} className="flex w-full items-center justify-between">
                  <input type="hidden" name="plan" value={plan.id} />
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-muted">{plan.price}</div>
                  </div>
                  <Button type="submit">Subscribe</Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
