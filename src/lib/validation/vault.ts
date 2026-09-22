import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";

export const VAULT_ENTRY_TYPES = ["lesson_learned", "incident"] as const;
export type VaultEntryType = (typeof VAULT_ENTRY_TYPES)[number];

export const VAULT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type VaultSeverity = (typeof VAULT_SEVERITIES)[number];

export const SCRIPT_TYPES = [
  "powershell",
  "graph_api",
  "kql",
  "json",
  "terraform",
  "bicep",
  "arm_template",
] as const;
export type ScriptType = (typeof SCRIPT_TYPES)[number];

export const SCRIPT_RISK_LEVELS = ["low", "medium", "high"] as const;
export type ScriptRiskLevel = (typeof SCRIPT_RISK_LEVELS)[number];

// Matches the CHECK constraint on knowledge_scripts.source (migration
// 0029) — "manual" is the default for every script created through the
// regular Script Vault form; Code Creator's "Promote to Script Vault"
// action is the only caller that ever passes "ai_generated". "promoted"
// is reserved for a V2 flow, not written anywhere yet.
export const VAULT_SCRIPT_SOURCES = ["manual", "ai_generated", "promoted"] as const;
export type VaultScriptSource = (typeof VAULT_SCRIPT_SOURCES)[number];

// Shared by every optional narrative field below — empty-string form input
// becomes null rather than an empty row in the database, same transform
// convention src/lib/validation/knowledge-base.ts already uses for sourceUrl.
function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}

// Splits a raw comma-separated tag string into a normalized, deduplicated,
// lowercased array — the form field a person types into ("DLP, Teams,
// Retention") vs. the text[] column this becomes. Pure and unit-testable on
// its own, independent of any Supabase call.
export function normalizeTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const tag = part.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return Array.from(seen);
}

export const vaultEntrySchema = z.object({
  entryType: z.enum(VAULT_ENTRY_TYPES),
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  industry: nullableText(100),
  projectId: z.string().uuid().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  environment: nullableText(2000),
  symptoms: nullableText(4000),
  rootCause: nullableText(4000),
  troubleshootingSteps: nullableText(4000),
  resolution: nullableText(4000),
  validationSteps: nullableText(4000),
  preventativeControls: nullableText(4000),
  lessonsLearned: nullableText(4000),
  impact: nullableText(2000),
  severity: z.enum(VAULT_SEVERITIES).nullable(),
  escalationPath: nullableText(2000),
  timeToResolutionMinutes: z.coerce.number().int().nonnegative().nullable(),
  confidenceScore: z.coerce.number().int().min(1).max(5).nullable(),
  sourceUrl: z.string().url().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  tags: z.array(z.string().max(50)).max(20),
});

export type VaultEntryInput = z.infer<typeof vaultEntrySchema>;

export const vaultScriptSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  scriptType: z.enum(SCRIPT_TYPES),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  content: z.string().min(1).max(20000),
  riskLevel: z.enum(SCRIPT_RISK_LEVELS),
  dependencies: nullableText(2000),
  validationSteps: nullableText(4000),
  rollbackSteps: nullableText(4000),
  tags: z.array(z.string().max(50)).max(20),
});

export type VaultScriptInput = z.infer<typeof vaultScriptSchema>;
