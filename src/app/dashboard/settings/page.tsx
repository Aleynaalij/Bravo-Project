import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getBranding } from "@/lib/branding";
import { getSubscription } from "@/lib/billing/service";
import { BrandingForm } from "../branding/branding-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string }>;
}) {
  const { deleteError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const [branding, subscription, userRow] = await Promise.all([
    getBranding(supabase, accountId),
    getSubscription(supabase, accountId),
    supabase.from("users").select("role, created_at").eq("id", user.id).single(),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-brand hover:underline">
          &larr; Back to projects
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold">Settings</h1>
        <p className="mb-6 text-sm text-muted">Manage your account, appearance, and firm branding.</p>

        {deleteError && (
          <Alert variant="error" className="mb-6">
            {deleteError}
          </Alert>
        )}

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="font-medium">Profile</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Role</dt>
                <dd className="capitalize">{userRow.data?.role ?? "owner"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Member since</dt>
                <dd>
                  {userRow.data?.created_at
                    ? new Date(userRow.data.created_at).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-medium">Appearance</h2>
            <p className="text-sm text-muted">Choose how BravoPilot looks on this device.</p>
            <ThemeToggle />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-medium">Security</h2>
            <ChangePasswordForm />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-medium">Branding</h2>
            <p className="text-sm text-muted">
              Customize how your firm appears on generated DOCX, PDF, and PPTX deliverables.
            </p>
            <BrandingForm branding={branding} />
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">Billing</h2>
              {subscription?.status && <Badge tone="brand">{subscription.status}</Badge>}
            </div>
            <p className="text-sm text-muted">
              Current plan: <span className="font-medium text-foreground">{subscription?.plan ?? "trial"}</span>
            </p>
            <Link href="/dashboard/billing" className="text-sm text-brand hover:underline w-fit">
              Manage billing &rarr;
            </Link>
          </Card>

          <Card className="flex flex-col gap-3 border-error-border">
            <h2 className="font-medium text-error-text">Danger zone</h2>
            <DeleteAccountForm email={user.email!} />
          </Card>
        </div>
      </main>
    </>
  );
}
