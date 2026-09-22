import { z } from "zod";
import { SCRIPT_TYPES } from "@/lib/validation/vault";
import { ENVIRONMENT_PROFILES } from "@/lib/domain/environment-profiles";

// Duplicated locally rather than importing from validation/vault.ts —
// matches this codebase's existing convention (knowledge-base.ts already
// inlines the same pattern by hand rather than sharing vault.ts's copy).
function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}

// ---- Coding Standards Templates ----

export const codingStandardSchema = z.object({
  scriptType: z.enum(SCRIPT_TYPES),
  requiredElements: z.array(z.string().min(1).max(100)).max(30),
  notes: nullableText(2000),
});
export type CodingStandardInput = z.infer<typeof codingStandardSchema>;

// ---- Code Auditor request ----

export const codeAuditRequestSchema = z.object({
  scriptType: z.enum(SCRIPT_TYPES),
  code: z.string().min(1).max(20000),
});
export type CodeAuditRequestInput = z.infer<typeof codeAuditRequestSchema>;

// ---- Code Creator request ----
// The fixed, environment-aware requirements form (confirmed design
// decision — no AI-generated dynamic follow-up questions in v1). Maps
// directly onto the brief's own example question list: PS version ->
// languageVersion, Windows/Linux -> operatingSystem, GCC/Commercial ->
// environmentProfile, cert vs interactive auth -> authMethod, "expected
// number of policies" -> additionalContext, output location ->
// outputLocation. Every field but scriptType/environmentProfile/
// description is nullable since not every field applies to every script
// type (authMethod means little for a Bicep template) — the form only
// shows what's relevant for the chosen scriptType, the schema just
// doesn't force an answer to an inapplicable question.

export const OPERATING_SYSTEMS = ["windows", "linux", "cross_platform"] as const;
export type OperatingSystem = (typeof OPERATING_SYSTEMS)[number];

export const AUTH_METHODS = ["certificate", "client_secret", "interactive", "managed_identity"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const codeCreatorRequestSchema = z.object({
  description: z.string().min(1).max(2000),
  scriptType: z.enum(SCRIPT_TYPES),
  environmentProfile: z.enum(ENVIRONMENT_PROFILES),
  operatingSystem: z.enum(OPERATING_SYSTEMS).nullable(),
  authMethod: z.enum(AUTH_METHODS).nullable(),
  languageVersion: nullableText(50),
  outputLocation: nullableText(200),
  additionalContext: nullableText(2000),
});
export type CodeCreatorRequestInput = z.infer<typeof codeCreatorRequestSchema>;

// ---- Code Auditor AI response ----
// Same three-layer validation this app already applies to deliverable
// generation (src/lib/generation/run.ts): JSON.parse, then this Zod
// schema, then a structural sanity check here via superRefine — catching
// a scorecard that doesn't match its own findings the same way run.ts's
// heading-match guard catches a response that parsed fine but drifted
// from what was actually asked for.

export const AUDIT_SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

const auditFindingSchema = z.object({
  severity: z.enum(AUDIT_SEVERITIES),
  title: z.string().min(1).max(150),
  detail: z.string().min(1).max(1000),
});
export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const codeAuditResultSchema = z
  .object({
    security: z.array(auditFindingSchema).max(20),
    performance: z.array(auditFindingSchema).max(20),
    maintainability: z.array(auditFindingSchema).max(20),
    reliability: z.array(auditFindingSchema).max(20),
    bestPractices: z.array(auditFindingSchema).max(20),
    scoreCard: z.object({
      security: z.number().int().min(0).max(100),
      performance: z.number().int().min(0).max(100),
      maintainability: z.number().int().min(0).max(100),
      documentation: z.number().int().min(0).max(100),
      overall: z.number().int().min(0).max(100),
    }),
  })
  .superRefine((result, ctx) => {
    const hasCriticalOrHighSecurity = result.security.some(
      (f) => f.severity === "critical" || f.severity === "high",
    );
    if (hasCriticalOrHighSecurity && result.scoreCard.security >= 90) {
      ctx.addIssue({
        code: "custom",
        path: ["scoreCard", "security"],
        message: "Security score is inconsistent with a critical/high security finding in the same response",
      });
    }
  });
export type CodeAuditResult = z.infer<typeof codeAuditResultSchema>;

// ---- Code Creator AI response ----

export const generatedScriptSchema = z.object({
  content: z.string().min(1).max(20000),
  notes: z.string().max(2000),
  rollback: z.string().max(2000),
});
export type GeneratedScript = z.infer<typeof generatedScriptSchema>;
