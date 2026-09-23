import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { architectureDiagramSchema } from "@/lib/validation/deliverable";

// Same "empty form input becomes null" convention as validation/vault.ts
// and validation/troubleshoot.ts's own local nullableText.
function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}

export const architectureAdvisorRequestSchema = z.object({
  industry: z.string().min(1).max(100),
  userCount: z.coerce.number().int().positive(),
  licensingTier: z.string().min(1).max(100),
  complianceRequirements: nullableText(2000),
  securityRequirements: nullableText(2000),
  businessGoals: nullableText(2000),
  projectId: z.string().uuid().nullable(),
});
export type ArchitectureAdvisorRequestInput = z.infer<typeof architectureAdvisorRequestSchema>;

// diagram is imported from validation/deliverable.ts, not redefined — same
// general-purpose {title, nodes, edges} shape the deliverable engine's
// High-Level Design output already uses, reused here with zero changes.
export const architectureAdvisorResultSchema = z.object({
  recommendedServices: z.array(z.enum(SERVICE_TYPES)).min(1),
  diagram: architectureDiagramSchema,
  deploymentRoadmap: z
    .array(z.object({ phase: z.string().min(1).max(100), description: z.string().min(1).max(1000) }))
    .min(1)
    .max(10),
  risks: z.array(z.string().max(500)).max(15),
  dependencies: z.array(z.string().max(500)).max(15),
  licensingRequirements: z.array(z.string().max(500)).max(10),
  implementationSequence: z.array(z.string().max(500)).min(1).max(20),
  operationalConsiderations: z.array(z.string().max(500)).max(15),
});
export type ArchitectureAdvisorResult = z.infer<typeof architectureAdvisorResultSchema>;
