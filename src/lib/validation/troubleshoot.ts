import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";

// Same "empty form input becomes null, not an empty-string row" convention
// as validation/vault.ts's own local nullableText.
function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}

export const troubleshootRequestSchema = z.object({
  problemStatement: z.string().min(1).max(4000),
  environment: nullableText(2000),
  licensing: nullableText(500),
  symptoms: nullableText(4000),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  projectId: z.string().uuid().nullable(),
});
export type TroubleshootRequestInput = z.infer<typeof troubleshootRequestSchema>;

export const TROUBLESHOOT_LIKELIHOODS = ["low", "medium", "high"] as const;
export type TroubleshootLikelihood = (typeof TROUBLESHOOT_LIKELIHOODS)[number];

// The AI's structured diagnosis — real "similar historical issues" (from
// searchVault) are merged in by runTroubleshoot after this validates, never
// asked of the model itself (src/lib/eks/troubleshoot.ts's doc comment).
export const troubleshootResultSchema = z
  .object({
    potentialCauses: z
      .array(
        z.object({
          title: z.string().min(1).max(150),
          explanation: z.string().min(1).max(1000),
          likelihood: z.enum(TROUBLESHOOT_LIKELIHOODS),
        }),
      )
      .min(1)
      .max(10),
    troubleshootingFlow: z.array(z.string().min(1).max(500)).min(1).max(20),
    requiredValidation: z.array(z.string().min(1).max(500)).max(10),
    suggestedCommands: z
      .array(z.object({ description: z.string().max(300), command: z.string().max(2000) }))
      .max(15),
    escalationPath: z.string().min(1).max(1000),
    architectureConcerns: z.array(z.string().max(500)).max(10),
    confidenceScore: z.number().int().min(0).max(100),
  })
  // Internal-consistency check: a model claiming high confidence with no
  // high-likelihood cause listed is self-contradictory — same "catch the
  // model contradicting its own output" spirit as generation/run.ts's
  // headingsMatchRequiredSections, just a different kind of drift.
  .superRefine((result, ctx) => {
    const hasHighCause = result.potentialCauses.some((c) => c.likelihood === "high");
    if (result.confidenceScore >= 80 && !hasHighCause) {
      ctx.addIssue({
        code: "custom",
        path: ["confidenceScore"],
        message: "High confidence without any high-likelihood cause is internally inconsistent",
      });
    }
  });
export type TroubleshootResult = z.infer<typeof troubleshootResultSchema>;
