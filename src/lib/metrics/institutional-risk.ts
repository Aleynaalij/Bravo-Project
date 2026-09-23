import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";

export const INSTITUTIONAL_RISK_LEVELS = ["low", "elevated", "high"] as const;
export type InstitutionalRiskLevel = (typeof INSTITUTIONAL_RISK_LEVELS)[number];

export const INSTITUTIONAL_RISK_LABELS: Record<InstitutionalRiskLevel, string> = {
  low: "Low risk",
  elevated: "Elevated risk",
  high: "High risk",
};

// Confirmed thresholds (EKS V2 plan, Confirmed Decision 5) — a single
// author holding >=50% of a service area's captured institutional
// knowledge (lessons learned/incidents, scripts, SOPs, playbooks) is
// "elevated" risk (that person leaving takes half the area's documented
// know-how with them); >=75% is "high". A minimum of 3 captured items per
// service area is required before scoring at all, to avoid a lone early
// entry reading as "100% risk" noise. Same documented-judgment-call
// framing as delivery-risk.ts's thresholds — not a certified risk model.
const ELEVATED_SHARE_THRESHOLD = 0.5;
const HIGH_SHARE_THRESHOLD = 0.75;
const MIN_ITEMS_TO_SCORE = 3;

export interface InstitutionalRiskInput {
  serviceType: ServiceType | null;
  authorEmail: string;
}

export interface ServiceAreaRisk {
  serviceType: ServiceType;
  itemCount: number;
  topAuthorEmail: string;
  topAuthorShare: number;
  risk: InstitutionalRiskLevel;
}

export interface InstitutionalRiskSummary {
  byServiceArea: ServiceAreaRisk[];
  // Service areas with captured content but under MIN_ITEMS_TO_SCORE —
  // present in the account's data but deliberately not scored.
  unscored: { serviceType: ServiceType; itemCount: number }[];
}

function riskForShare(share: number): InstitutionalRiskLevel {
  if (share >= HIGH_SHARE_THRESHOLD) return "high";
  if (share >= ELEVATED_SHARE_THRESHOLD) return "elevated";
  return "low";
}

// Pure aggregation over captured-content rows from any/all of
// knowledge_vault_entries, knowledge_scripts, sops, and playbooks. Rows
// with no service_type (not every entry has one) are excluded — there's
// no service area to attribute them to.
export function computeInstitutionalRisk(rows: InstitutionalRiskInput[]): InstitutionalRiskSummary {
  const byService = new Map<ServiceType, Map<string, number>>();

  for (const row of rows) {
    if (!row.serviceType) continue;
    const authorCounts = byService.get(row.serviceType) ?? new Map<string, number>();
    authorCounts.set(row.authorEmail, (authorCounts.get(row.authorEmail) ?? 0) + 1);
    byService.set(row.serviceType, authorCounts);
  }

  const byServiceArea: ServiceAreaRisk[] = [];
  const unscored: { serviceType: ServiceType; itemCount: number }[] = [];

  for (const [serviceType, authorCounts] of byService.entries()) {
    const itemCount = Array.from(authorCounts.values()).reduce((sum, n) => sum + n, 0);
    if (itemCount < MIN_ITEMS_TO_SCORE) {
      unscored.push({ serviceType, itemCount });
      continue;
    }

    let topAuthorEmail = "";
    let topAuthorCount = 0;
    for (const [authorEmail, count] of authorCounts.entries()) {
      if (count > topAuthorCount) {
        topAuthorCount = count;
        topAuthorEmail = authorEmail;
      }
    }
    const topAuthorShare = topAuthorCount / itemCount;

    byServiceArea.push({
      serviceType,
      itemCount,
      topAuthorEmail,
      topAuthorShare,
      risk: riskForShare(topAuthorShare),
    });
  }

  byServiceArea.sort((a, b) => b.topAuthorShare - a.topAuthorShare);
  return { byServiceArea, unscored };
}

// Fetches from every private, account-scoped content table this phase's
// modules write to and flattens into the {serviceType, authorEmail} shape
// computeInstitutionalRisk expects — RLS on each table scopes this to the
// caller's own account, same "the client passed in decides the scope"
// convention as usage.ts's getUsageMetrics.
export async function getInstitutionalRiskSummary(supabase: SupabaseClient): Promise<InstitutionalRiskSummary> {
  const [vaultResult, scriptsResult, sopsResult, playbooksResult] = await Promise.all([
    supabase.from("knowledge_vault_entries").select("service_type, author_email"),
    supabase.from("knowledge_scripts").select("service_type, author_email"),
    supabase.from("sops").select("service_type, author_email"),
    supabase.from("playbooks").select("service_type, author_email"),
  ]);

  if (vaultResult.error) throw vaultResult.error;
  if (scriptsResult.error) throw scriptsResult.error;
  if (sopsResult.error) throw sopsResult.error;
  if (playbooksResult.error) throw playbooksResult.error;

  const rows: InstitutionalRiskInput[] = [
    ...(vaultResult.data ?? []),
    ...(scriptsResult.data ?? []),
    ...(sopsResult.data ?? []),
    ...(playbooksResult.data ?? []),
  ].map((row) => ({ serviceType: row.service_type, authorEmail: row.author_email }));

  return computeInstitutionalRisk(rows);
}

export const AGING_CONTENT_TYPES = ["lesson_learned_or_incident", "script", "sop", "playbook"] as const;
export type AgingContentType = (typeof AGING_CONTENT_TYPES)[number];

export const AGING_CONTENT_TYPE_LABELS: Record<AgingContentType, string> = {
  lesson_learned_or_incident: "Lesson learned / Incident",
  script: "Script",
  sop: "SOP",
  playbook: "Playbook",
};

// 6 months (EKS V2 plan, Module 9) — a documented judgment call, same
// framing as the share thresholds above, not a certified staleness model.
export const AGING_CONTENT_MONTHS = 6;
const AGING_CONTENT_DAYS = AGING_CONTENT_MONTHS * 30;

export interface AgingContentItem {
  id: string;
  title: string;
  contentType: AgingContentType;
  updatedAt: string;
}

interface AgingContentRow {
  id: string;
  title: string;
  contentType: AgingContentType;
  updated_at: string;
}

function daysSince(isoDate: string, now: Date): number {
  return (now.getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

// Pure filter+sort over already-fetched rows from every content type that
// carries an updated_at column (knowledge_vault_entries/knowledge_scripts
// got theirs in migration 0036 specifically so this check means the same
// thing across every content type sops/playbooks already had it for).
// Oldest-edited first, so the most overdue-for-review content surfaces at
// the top. now defaults to the real clock but is overridable, same
// testability shape as engagement.ts's daysSince/now parameter.
export function computeAgingContent(rows: AgingContentRow[], now: Date = new Date()): AgingContentItem[] {
  return rows
    .filter((row) => daysSince(row.updated_at, now) >= AGING_CONTENT_DAYS)
    .map((row) => ({ id: row.id, title: row.title, contentType: row.contentType, updatedAt: row.updated_at }))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .slice(0, 10);
}

// Same per-table fetch shape as getInstitutionalRiskSummary above, just
// selecting updated_at instead of service_type/author_email and
// normalizing each table's own title-ish column (knowledge_scripts calls
// it `name`) into one common `title` field.
export async function getAgingContent(supabase: SupabaseClient): Promise<AgingContentItem[]> {
  const [vaultResult, scriptsResult, sopsResult, playbooksResult] = await Promise.all([
    supabase.from("knowledge_vault_entries").select("id, title, updated_at"),
    supabase.from("knowledge_scripts").select("id, name, updated_at"),
    supabase.from("sops").select("id, title, updated_at"),
    supabase.from("playbooks").select("id, title, updated_at"),
  ]);

  if (vaultResult.error) throw vaultResult.error;
  if (scriptsResult.error) throw scriptsResult.error;
  if (sopsResult.error) throw sopsResult.error;
  if (playbooksResult.error) throw playbooksResult.error;

  const rows: AgingContentRow[] = [
    ...(vaultResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      contentType: "lesson_learned_or_incident" as const,
      updated_at: row.updated_at,
    })),
    ...(scriptsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.name,
      contentType: "script" as const,
      updated_at: row.updated_at,
    })),
    ...(sopsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      contentType: "sop" as const,
      updated_at: row.updated_at,
    })),
    ...(playbooksResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      contentType: "playbook" as const,
      updated_at: row.updated_at,
    })),
  ];

  return computeAgingContent(rows);
}
