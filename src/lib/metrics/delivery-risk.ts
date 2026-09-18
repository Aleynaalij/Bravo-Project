import type { ServiceType } from "@/lib/domain/enums";
import { SERVICE_PRACTICE_AREA } from "@/lib/domain/labels";

export const DELIVERY_RISK_VALUES = ["low", "elevated", "high"] as const;
export type DeliveryRisk = (typeof DELIVERY_RISK_VALUES)[number];

export const DELIVERY_RISK_LABELS: Record<DeliveryRisk, string> = {
  low: "Low risk",
  elevated: "Elevated risk",
  high: "High risk",
};

// Placeholder thresholds — a human should revisit these against real
// delivery outcomes once there are enough closed engagements to check
// them against, same status as SEAT_LIMITS/TRIAL_DAYS elsewhere in this
// app: a documented judgment call, not a certified risk model. Each
// threshold reflects one real, independent source of delivery complexity
// a consultant would actually flag during scoping, all drawn from real
// intake fields — nothing estimated or industry-averaged:
//   - a large user population multiplies the blast radius of any
//     misconfiguration and the coordination a rollout needs;
//   - operating across multiple geographic locations adds data-residency
//     and timezone/rollout-coordination complexity;
//   - a wide compliance-service footprint (DLP + retention + insider
//     risk + ... all in scope at once) compounds policy-interaction risk
//     a narrower engagement doesn't have.
const LARGE_USER_COUNT = 1000;
const VERY_LARGE_USER_COUNT = 5000;
const MULTI_REGION_THRESHOLD = 2;
const WIDE_COMPLIANCE_SCOPE_THRESHOLD = 4;

export interface DeliveryRiskInput {
  userCount: number;
  geographicLocations: string[];
  services: ServiceType[];
}

export function computeDeliveryRiskScore(input: DeliveryRiskInput): number {
  let score = 0;
  if (input.userCount >= LARGE_USER_COUNT) score += 1;
  if (input.userCount >= VERY_LARGE_USER_COUNT) score += 1;
  if (input.geographicLocations.length >= MULTI_REGION_THRESHOLD) score += 1;

  const complianceServiceCount = input.services.filter(
    (service) => SERVICE_PRACTICE_AREA[service] === "data_security_compliance",
  ).length;
  if (complianceServiceCount >= WIDE_COMPLIANCE_SCOPE_THRESHOLD) score += 1;

  return score;
}

export function computeDeliveryRisk(input: DeliveryRiskInput): DeliveryRisk {
  const score = computeDeliveryRiskScore(input);
  if (score >= 3) return "high";
  if (score >= 1) return "elevated";
  return "low";
}

export interface DeliveryRiskProjectInput extends DeliveryRiskInput {
  id: string;
}

export interface DeliveryRiskSummary {
  byProject: Record<string, DeliveryRisk>;
  counts: Record<DeliveryRisk, number>;
}

// Pure derived grouping over data the caller already has (project list
// with services) — no new query, same "reshape what's already fetched"
// pattern as groupServicesByPracticeArea in src/lib/metrics/usage.ts.
export function summarizeDeliveryRisk(projects: DeliveryRiskProjectInput[]): DeliveryRiskSummary {
  const byProject: Record<string, DeliveryRisk> = {};
  const counts: Record<DeliveryRisk, number> = { low: 0, elevated: 0, high: 0 };

  for (const project of projects) {
    const risk = computeDeliveryRisk(project);
    byProject[project.id] = risk;
    counts[risk] += 1;
  }

  return { byProject, counts };
}
