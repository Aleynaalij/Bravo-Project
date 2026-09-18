import type { SupabaseClient } from "@supabase/supabase-js";
import { countOwners, listTeamMembers, type TeamMember } from "@/lib/team/service";
import { createAdminClient } from "@/lib/supabase/admin";

// Real, computable-today security signals only — deliberately not the
// brainstorm's fabricated "AI Security Dashboard" or a compliance-
// framework score, both of which would need either real event logging
// this app doesn't have or a real controls mapping nobody has done (see
// docs/validation-checklist.md). These two checks are genuine, real-time
// reads of this account's actual state via APIs the rest of the app
// already uses for team/auth management.
export type SecurityCheckStatus = "pass" | "fail" | "unavailable";

export interface SecurityCheck {
  id: "single_owner" | "mfa_coverage";
  label: string;
  status: SecurityCheckStatus;
  // null means this check couldn't be measured right now and is excluded
  // from the score average — never silently counted as either a pass or
  // a fail.
  points: number | null;
  detail: string;
}

export interface SecurityScoreResult {
  score: number;
  checks: SecurityCheck[];
}

// Not a risk for a true solo account — there's nobody else to promote,
// so a single owner is just how a one-person account looks. It only
// becomes a real single-point-of-failure once there's a team that would
// be locked out of billing/team-management/danger-zone actions if that
// one owner left or lost access.
export function computeSingleOwnerCheck(teamSize: number, ownerCount: number): SecurityCheck {
  const risk = teamSize > 1 && ownerCount <= 1;
  return {
    id: "single_owner",
    label: "Multiple account owners",
    status: risk ? "fail" : "pass",
    points: risk ? 0 : 100,
    detail: risk
      ? "Only one account owner — promote a trusted teammate so billing and team management aren't a single point of failure."
      : teamSize > 1
        ? `${ownerCount} of ${teamSize} teammates are account owners.`
        : "Solo account — not applicable.",
  };
}

export function computeMfaCoverageCheck(teamSize: number, mfaEnrolledCount: number): SecurityCheck {
  const points = teamSize === 0 ? 100 : Math.round((mfaEnrolledCount / teamSize) * 100);
  return {
    id: "mfa_coverage",
    label: "Two-factor authentication coverage",
    status: mfaEnrolledCount === teamSize ? "pass" : "fail",
    points,
    detail: `${mfaEnrolledCount} of ${teamSize} teammate${teamSize === 1 ? "" : "s"} ${teamSize === 1 ? "has" : "have"} two-factor authentication enabled.`,
  };
}

export function unavailableMfaCoverageCheck(): SecurityCheck {
  return {
    id: "mfa_coverage",
    label: "Two-factor authentication coverage",
    status: "unavailable",
    points: null,
    detail: "Couldn't reach the authentication service to check this right now.",
  };
}

// Excludes unavailable checks entirely rather than counting them as a
// pass or a fail — a check that couldn't run shouldn't move the score
// in either direction.
export function aggregateSecurityScore(checks: SecurityCheck[]): number {
  const scored = checks.filter((check): check is SecurityCheck & { points: number } => check.points !== null);
  if (scored.length === 0) return 100;
  return Math.round(scored.reduce((sum, check) => sum + check.points, 0) / scored.length);
}

// One Admin API lookup per teammate — fine at this app's seat-cap scale
// (10 max on the Professional plan, src/lib/billing/seats.ts). Reads
// User.factors, which Supabase Auth itself populates on every
// getUserById call (a real field, not derived or guessed) — status
// "verified" means an actually-completed TOTP/phone enrollment, not just
// one in progress.
async function tryComputeMfaCoverageCheck(team: TeamMember[]): Promise<SecurityCheck> {
  try {
    const admin = createAdminClient();
    const results = await Promise.all(
      team.map(async (member) => {
        const { data, error } = await admin.auth.admin.getUserById(member.id);
        if (error || !data.user) return false;
        return (data.user.factors ?? []).some((factor) => factor.status === "verified");
      }),
    );
    const enrolledCount = results.filter(Boolean).length;
    return computeMfaCoverageCheck(team.length, enrolledCount);
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY unconfigured, or the Admin API is
    // unreachable (this sandbox's standard network-egress block on the
    // real Supabase host, same constraint as every other live-Auth-API
    // call in this project) — degrade to "unavailable," never to a false
    // "nobody has 2FA."
    return unavailableMfaCoverageCheck();
  }
}

export async function getSecurityScore(
  supabase: SupabaseClient,
  accountId: string,
): Promise<SecurityScoreResult> {
  const team = await listTeamMembers(supabase, accountId);
  const owners = await countOwners(supabase, accountId);

  const checks: SecurityCheck[] = [
    computeSingleOwnerCheck(team.length, owners),
    await tryComputeMfaCoverageCheck(team),
  ];

  return { score: aggregateSecurityScore(checks), checks };
}
