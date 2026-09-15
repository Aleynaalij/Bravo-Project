import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase Auth (email confirmation link,
// or the Microsoft OAuth flow started in login/actions.ts).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // A failed exchange on the password-recovery path means the reset link
  // was invalid, expired, or already used — send them to request a fresh
  // one instead of a generic login error that doesn't explain why.
  const errorRedirect = next.startsWith("/reset-password") ? "/forgot-password" : "/login";
  return NextResponse.redirect(
    `${origin}${errorRedirect}?error=${encodeURIComponent("Could not authenticate")}`,
  );
}
