import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

// Landing point after /auth/callback exchanges a password-recovery link
// for a session. No session here means the link was invalid, expired, or
// already used — send them back to request a fresh one rather than
// bouncing to /login, which wouldn't explain why they're locked out.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/dashboard" />
      </div>

      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted">Choose a new password for your account.</p>
        </div>
        <ResetPasswordForm />
      </Card>
    </main>
  );
}
