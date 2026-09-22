import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { getBranding } from "@/lib/branding";
import { getSubscription } from "@/lib/billing/service";
import { getSeatLimit } from "@/lib/billing/seats";
import { listTeamMembers } from "@/lib/team/service";
import { listAuditLog, AUDIT_ACTION_LABELS } from "@/lib/audit/service";
import { getSecurityScore } from "@/lib/security/score";
import { BrandingForm } from "../branding/branding-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { TeamSection } from "./team-section";
import { OrganizationSection } from "./organization-section";
import { MfaSection } from "./mfa-section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ScoreBar } from "@/components/charts/score-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";

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
  const [branding, subscription, userRow, accountRow, teamMembers, auditLog, securityScore] =
    await Promise.all([
      getBranding(supabase, accountId),
      getSubscription(supabase, accountId),
      supabase.from("users").select("role, created_at").eq("id", user.id).single(),
      supabase.from("accounts").select("firm_name, created_at").eq("id", accountId).single(),
      listTeamMembers(supabase, accountId),
      // RLS already restricts this to an account owner (see
      // supabase/migrations/0019_audit_log.sql) — a non-owner just gets an
      // empty list back, which is why this runs unconditionally rather than
      // being gated on isOwner first.
      listAuditLog(supabase, accountId, 20),
      getSecurityScore(supabase, accountId),
    ]);
  const isOwner = userRow.data?.role === "owner";
  const scoreTone = securityScore.score >= 80 ? "success" : securityScore.score >= 50 ? "warning" : "error";

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="Settings" description="Manage your account, appearance, and firm branding." />

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
          <h2 className="font-medium">Organization</h2>
          <p className="text-sm text-muted">
            The account (tenant) your projects, deliverables, and team live under — distinct from
            any customer&apos;s own Microsoft 365 tenant, which this app never connects to.
          </p>
          <OrganizationSection
            accountId={accountId}
            firmName={accountRow.data?.firm_name ?? null}
            createdAt={accountRow.data?.created_at ?? new Date().toISOString()}
            isOwner={isOwner}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">Team</h2>
            <span className="text-xs text-muted">
              {teamMembers.length} / {getSeatLimit(subscription?.plan ?? "trial")} seats
            </span>
          </div>
          <p className="text-sm text-muted">
            Everyone below shares full access to this account&apos;s projects and deliverables.
          </p>
          <TeamSection members={teamMembers} currentUserId={user.id} isOwner={isOwner} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-medium">Appearance</h2>
          <p className="text-sm text-muted">Choose how QuePilot looks on this device.</p>
          <ThemeToggle />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">Security score</h2>
            <Badge tone={scoreTone}>{securityScore.score}/100</Badge>
          </div>
          <ScoreBar value={securityScore.score} tone={scoreTone} />
          <p className="text-sm text-muted">
            Two real, checkable signals about this account&apos;s own security posture — not a
            compliance certification or an industry benchmark.
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {securityScore.checks.map((check) => (
              <li
                key={check.id}
                className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <span className="font-medium">{check.label}</span>
                <span className="flex items-start gap-2 text-xs text-muted">
                  <Badge
                    tone={
                      check.status === "pass" ? "success" : check.status === "fail" ? "error" : "neutral"
                    }
                  >
                    {check.status === "pass" ? "Pass" : check.status === "fail" ? "Needs attention" : "Unavailable"}
                  </Badge>
                  {check.detail}
                </span>
              </li>
            ))}
          </ul>
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
            {subscription?.stripe_subscription_id && (
              <>
                {" "}
                &middot; billed for {subscription.quantity} seat{subscription.quantity === 1 ? "" : "s"}
              </>
            )}
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
  );
}
