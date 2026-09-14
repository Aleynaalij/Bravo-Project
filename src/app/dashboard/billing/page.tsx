import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getSubscription } from "@/lib/billing/service";
import { startCheckoutAction, openBillingPortalAction } from "./actions";

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
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm underline">
        &larr; Back to projects
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-semibold">Billing</h1>

      {checkout === "success" && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Subscription updated. It may take a few seconds to reflect below.
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Checkout cancelled — no changes made.
        </p>
      )}

      <p className="mb-6 text-sm text-gray-600">
        Current plan: <span className="font-medium">{subscription?.plan ?? "trial"}</span>
        {subscription?.status && ` (${subscription.status})`}
      </p>

      {hasActiveSubscription ? (
        <form action={openBillingPortalAction}>
          <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm text-white">
            Manage billing
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {PLANS.map((plan) => (
            <form key={plan.id} action={startCheckoutAction} className="flex items-center justify-between rounded-md border px-4 py-3">
              <input type="hidden" name="plan" value={plan.id} />
              <div>
                <div className="font-medium">{plan.name}</div>
                <div className="text-sm text-gray-600">{plan.price}</div>
              </div>
              <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm text-white">
                Subscribe
              </button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
}
