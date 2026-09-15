import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

// Landing point for an invited teammate after /auth/callback exchanges
// their invite code for a session (see inviteTeamMemberAction) — they
// were never given a password, so this is the first thing they see.
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/dashboard" />
      </div>

      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Welcome to BravoPilot</h1>
          <p className="text-sm text-muted">Set a password to finish joining your team.</p>
        </div>
        <SetPasswordForm />
      </Card>
    </main>
  );
}
