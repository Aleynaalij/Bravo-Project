import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getBranding } from "@/lib/branding";
import { getSubscription } from "@/lib/billing/service";
import { listTeamMembers } from "@/lib/team/service";
import { listAuditLog, AUDIT_ACTION_LABELS } from "@/lib/audit/service";
import { BrandingForm } from "../branding/branding-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { TeamSection } from "./team-section";
import { MfaSection } from "./mfa-section";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string; teamError?: string }>;
}) {
  const { deleteError, teamError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const [branding, subscription, userRow, teamMembers, auditLog] = await Promise.all([
    getBranding(supabase, accountId),
    getSubscription(supabase, accountId),
    supabase.from("users").select("role, created_at").eq("id", user.id).single(),
    listTeamMembers(supabase, accountId),
    // RLS already restricts this to an account owner (see
    // supabase/migrations/0019_audit_log.sql) — a non-owner just gets an
    // empty list back, which is why this runs unconditionally rather than
    // being gated on isOwner first.
    listAuditLog(supabase, accountId, 20),
  ]);
  const isOwner = userRow.data?.role === "owner";

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
        {teamError && (
          <Alert variant="error" className="mb-6">
            {teamError}
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
            <h2 className="font-medium">Team</h2>
            <p className="text-sm text-muted">
              Everyone below shares full access to this account&apos;s projects and deliverables.
            </p>
            <TeamSection members={teamMembers} currentUserId={user.id} isOwner={isOwner} />
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
            <h2 className="font-medium">Two-factor authentication</h2>
            <MfaSection />
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

          {isOwner && (
            <Card className="flex flex-col gap-3">
              <h2 className="font-medium">Audit log</h2>
              <p className="text-sm text-muted">
                Team and knowledge-base changes on this account, most recent first.
              </p>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium">{AUDIT_ACTION_LABELS[entry.action]}</span>
                        <span className="text-muted"> by {entry.actorEmail}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {isOwner && (
            <Card className="flex flex-col gap-3 border-error-border">
              <h2 className="font-medium text-error-text">Danger zone</h2>
              <DeleteAccountForm email={user.email!} />
            </Card>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>{" "}
          &middot;{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </main>
    </>
  );
}
