"use server";

import { createClient } from "@/lib/supabase/server";

export interface ForgotPasswordState {
  submitted?: boolean;
  error?: string;
}

// Always reports success regardless of whether the email exists — a
// different response for "no account" vs "email sent" would let anyone
// enumerate which emails have QuePilot accounts. Supabase's own error
// for a genuinely malformed address (e.g. missing @) is still surfaced,
// since that's a client-side input mistake, not an enumeration signal.
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error && error.code === "validation_failed") {
    return { error: "Enter a valid email address" };
  }

  return { submitted: true };
}
