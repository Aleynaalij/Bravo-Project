"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccountOwner, ForbiddenError } from "@/lib/auth/session";
import { getSubscription } from "@/lib/billing/service";
import { getStripeClient } from "@/lib/billing/stripe";
import { changePasswordSchema } from "@/lib/validation/settings";
import { inviteTeamMemberSchema } from "@/lib/validation/team";
import { countOwners } from "@/lib/team/service";
import { writeAuditLog } from "@/lib/audit/service";

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
// everything under them per docs/ERD.md — every teammate loses access
// immediately, not just the caller), then deletes the Supabase Auth user
// itself via the admin API — deleting the account row alone would leave
// the person still able to log in with no account behind them. Owner-only
// now that an account can have more than one user: a teammate deleting
// the whole account out from under everyone else would be a real footgun.
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

  let accountId: string;
  try {
    ({ accountId } = await requireAccountOwner(supabase));
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect(`/dashboard/settings?deleteError=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  const subscription = await getSubscription(supabase, accountId);
  if (subscription?.stripe_subscription_id) {
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  }

  // No audit_log entry for this one: account_id references accounts(id)
  // on delete cascade (same retention story as every other account-scoped
  // table — see docs/validation-checklist.md), so a row written here would
  // be destroyed by the delete below before anyone could read it back.
  const { error: deleteAccountError } = await supabase.from("accounts").delete().eq("id", accountId);
  if (deleteAccountError) throw deleteAccountError;

  const admin = createAdminClient();
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) throw deleteUserError;

  await supabase.auth.signOut();
  redirect("/login?message=Your account has been deleted");
}

export interface TeamActionState {
  error?: string;
  success?: boolean;
}

export async function inviteTeamMemberAction(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const parsed = inviteTeamMemberSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }

  let accountId: string;
  let actorUserId: string;
  let actorEmail: string;
  try {
    const supabase = await createClient();
    ({ accountId, userId: actorUserId, email: actorEmail } = await requireAccountOwner(supabase));
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const admin = createAdminClient();
  // invited_account_id is read by handle_new_auth_user() (migration 0017)
  // to join the inviter's existing account instead of provisioning a new
  // one — see that migration for the full trigger logic. redirectTo sends
  // the invited teammate straight to set-password after the existing
  // /auth/callback route exchanges their invite code for a session (no
  // changes needed there — it already redirects to whatever "next" says).
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { invited_account_id: accountId },
    redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
  });
  if (error) return { error: error.message };

  const supabase = await createClient();
  await writeAuditLog(supabase, {
    accountId,
    actorUserId,
    actorEmail,
    action: "team.invite",
    target: parsed.data.email,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function removeTeamMemberAction(formData: FormData): Promise<void> {
  const targetUserId = String(formData.get("userId") ?? "");

  const supabase = await createClient();
  let accountId: string;
  let userId: string;
  let actorEmail: string;
  try {
    ({ accountId, userId, email: actorEmail } = await requireAccountOwner(supabase));
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect(`/dashboard/settings?teamError=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  if (targetUserId === userId) {
    redirect(
      `/dashboard/settings?teamError=${encodeURIComponent("You can't remove yourself — delete the account instead if that's what you want")}`,
    );
  }

  // RLS already scopes this to the caller's own account; an empty result
  // means the target isn't a teammate, not that the row doesn't exist.
  const { data: target } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", targetUserId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!target) {
    redirect(`/dashboard/settings?teamError=${encodeURIComponent("That teammate wasn't found")}`);
  }

  if (target.role === "owner" && (await countOwners(supabase, accountId)) <= 1) {
    redirect(
      `/dashboard/settings?teamError=${encodeURIComponent("Every account needs at least one owner")}`,
    );
  }

  // Deleting the auth.users row cascades to public.users via the existing
  // FK, so the teammate loses both their data-access row and their actual
  // ability to log in — not just one or the other.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  if (error) throw error;

  await writeAuditLog(supabase, {
    accountId,
    actorUserId: userId,
    actorEmail,
    action: "team.remove",
    target: targetUserId,
    metadata: { removedRole: target.role },
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings");
}

export async function changeTeamMemberRoleAction(formData: FormData): Promise<void> {
  const targetUserId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  if (nextRole !== "owner" && nextRole !== "member") redirect("/dashboard/settings");

  const supabase = await createClient();
  let accountId: string;
  let actorUserId: string;
  let actorEmail: string;
  try {
    ({ accountId, userId: actorUserId, email: actorEmail } = await requireAccountOwner(supabase));
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect(`/dashboard/settings?teamError=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  if (nextRole === "member") {
    const { data: target } = await supabase
      .from("users")
      .select("role")
      .eq("id", targetUserId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (target?.role === "owner" && (await countOwners(supabase, accountId)) <= 1) {
      redirect(
        `/dashboard/settings?teamError=${encodeURIComponent("Every account needs at least one owner")}`,
      );
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ role: nextRole })
    .eq("id", targetUserId)
    .eq("account_id", accountId);
  if (error) throw error;

  await writeAuditLog(supabase, {
    accountId,
    actorUserId,
    actorEmail,
    action: "team.role_change",
    target: targetUserId,
    metadata: { newRole: nextRole },
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings");
}
