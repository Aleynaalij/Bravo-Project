import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/domain/enums";

// Sales-opportunity signal derived entirely from existing project_services
// selections — no schema change, no new tracking, no fabricated intent
// data. The idea: if services A and B are commonly selected together
// across this platform's accounts, an account that has A but not B looks
// like a plausible candidate to be offered B (and vice versa). This is a
// co-occurrence heuristic over real scoping data, not a predicted
// likelihood-to-buy score — explicitly documented as such, same
// "judgment call, not a certified score" convention as Engagement Health,
// Delivery Risk, and Security Score.
//
// Admin-only (platform-operator visibility across every account, same
// trust boundary as src/lib/metrics/usage.ts and billing.ts) — always
// called with the admin client.
export interface ServicePairCooccurrence {
  serviceA: ServiceType;
  serviceB: ServiceType;
  // Number of distinct accounts with BOTH services somewhere across their
  // projects — an account, not a project, is the unit of "bought
  // together," since the two services might have been scoped into
  // different engagements for the same client.
  accountCount: number;
}

export interface CrossSellOpportunity {
  accountId: string;
  accountLabel: string;
  hasService: ServiceType;
  missingService: ServiceType;
  // The co-occurrence pair's own accountCount — how many other accounts
  // already have both, i.e. how strong the underlying pattern is that
  // makes this a plausible opportunity rather than a guess.
  pairStrength: number;
}

export interface CrossSellSummary {
  topPairs: ServicePairCooccurrence[];
  opportunities: CrossSellOpportunity[];
}

// A pairing needs to show up in at least this many distinct accounts
// before it counts as a real pattern worth acting on — one account with
// two services together is just that account's scope, not a signal.
const MIN_PAIR_ACCOUNTS = 2;
const MAX_PAIRS = 8;
const MAX_OPPORTUNITIES = 20;

// Pure derived computation over data the caller already fetched — no
// query of its own, same "reshape what's already fetched" pattern as
// summarizeDeliveryRisk/groupServicesByPracticeArea — kept separate from
// getCrossSellSummary below so the co-occurrence/gap logic itself is
// unit-testable without a Supabase client.
export function computeCrossSellSummary(
  servicesByAccount: Map<string, Set<ServiceType>>,
  accountLabel: Map<string, string>,
): CrossSellSummary {
  // Every unordered pair of distinct services present together for at
  // least one account, counted by how many accounts have both.
  const pairCounts = new Map<string, { serviceA: ServiceType; serviceB: ServiceType; accountCount: number }>();
  for (const services of servicesByAccount.values()) {
    const sorted = Array.from(services).sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}::${sorted[j]}`;
        const existing = pairCounts.get(key) ?? { serviceA: sorted[i], serviceB: sorted[j], accountCount: 0 };
        existing.accountCount += 1;
        pairCounts.set(key, existing);
      }
    }
  }

  const topPairs = Array.from(pairCounts.values())
    .filter((pair) => pair.accountCount >= MIN_PAIR_ACCOUNTS)
    .sort((a, b) => b.accountCount - a.accountCount)
    .slice(0, MAX_PAIRS);

  // For each strong pair, any account with exactly one of the two
  // services is a candidate for the other — the missing half of a
  // pattern most of its peers already have both sides of.
  const opportunities: CrossSellOpportunity[] = [];
  for (const pair of topPairs) {
    for (const [accountId, services] of servicesByAccount.entries()) {
      const hasA = services.has(pair.serviceA);
      const hasB = services.has(pair.serviceB);
      if (hasA === hasB) continue; // has both or neither — not a gap
      opportunities.push({
        accountId,
        accountLabel: accountLabel.get(accountId) ?? accountId,
        hasService: hasA ? pair.serviceA : pair.serviceB,
        missingService: hasA ? pair.serviceB : pair.serviceA,
        pairStrength: pair.accountCount,
      });
    }
  }

  opportunities.sort((a, b) => b.pairStrength - a.pairStrength || a.accountLabel.localeCompare(b.accountLabel));

  return { topPairs, opportunities: opportunities.slice(0, MAX_OPPORTUNITIES) };
}

export async function getCrossSellSummary(admin: SupabaseClient): Promise<CrossSellSummary> {
  const [projectsResult, servicesResult, accountsResult] = await Promise.all([
    admin.from("projects").select("id, account_id"),
    admin.from("project_services").select("project_id, service_type"),
    admin.from("accounts").select("id, firm_name, email"),
  ]);
  if (projectsResult.error) throw projectsResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (accountsResult.error) throw accountsResult.error;

  const accountIdByProject = new Map<string, string>();
  for (const project of projectsResult.data ?? []) {
    accountIdByProject.set(project.id, project.account_id);
  }

  const accountLabel = new Map<string, string>();
  for (const account of accountsResult.data ?? []) {
    accountLabel.set(account.id, account.firm_name ?? account.email);
  }

  // Union of services selected anywhere across each account's projects.
  const servicesByAccount = new Map<string, Set<ServiceType>>();
  for (const row of servicesResult.data ?? []) {
    const accountId = accountIdByProject.get(row.project_id);
    if (!accountId) continue;
    const set = servicesByAccount.get(accountId) ?? new Set<ServiceType>();
    set.add(row.service_type as ServiceType);
    servicesByAccount.set(accountId, set);
  }

  return computeCrossSellSummary(servicesByAccount, accountLabel);
}
