"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccountId } from "@/lib/auth/session";
import { getSubscription } from "@/lib/billing/service";
import { getStripeClient } from "@/lib/billing/stripe";
import { changePasswordSchema } from "@/lib/validation/settings";

export interface SettingsActionState {
  error?: string;
  success?: boolean;
}

export async function changePasswordAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = changePasswordSchema.safeParse({
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

// Irreversible: cancels any active Stripe subscription, deletes the
// account row (cascades to users/branding/subscriptions/projects and
// everything under them per docs/ERD.md), then deletes the Supabase Auth
// user itself via the admin API — deleting the account row alone would
// leave the person still able to log in with no account behind them.
export async function deleteAccountAction(formData: FormData): Promise<void> {
  const confirmation = String(formData.get("confirmation") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  if (confirmation !== user.email) {
    redirect(`/dashboard/settings?deleteError=${encodeURIComponent("Email confirmation didn't match")}`);
  }

  const accountId = await requireAccountId(supabase);

  const subscription = await getSubscription(supabase, accountId);
  if (subscription?.stripe_subscription_id) {
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  }

  const { error: deleteAccountError } = await supabase.from("accounts").delete().eq("id", accountId);
  if (deleteAccountError) throw deleteAccountError;

  const admin = createAdminClient();
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) throw deleteUserError;

  await supabase.auth.signOut();
  redirect("/login?message=Your account has been deleted");
}
