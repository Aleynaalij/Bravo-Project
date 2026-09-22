import { z } from "zod";
import { generateCompletion } from "@/lib/ai/provider";
import { deliverableSectionSchema } from "@/lib/validation/deliverable";
import { headingsMatchRequiredSections } from "./run";

export class StructuredDocGenerationError extends Error {}

const structuredDocContentSchema = z.object({
  sections: z.array(deliverableSectionSchema),
});

export type StructuredDocContent = z.infer<typeof structuredDocContentSchema>;

export interface GenerateStructuredDocInput {
  // The exact heading list the caller told the model to use, in order —
  // checked against the response the same way runGeneration checks a
  // deliverable's sections (SEC-02).
  requiredHeadings: readonly string[];
  // Fully assembled prompt, including any untrusted-data delimiting the
  // caller needs — this function doesn't know which parts of the prompt
  // are account-authored free text, so that wrapping is the caller's job
  // (same division of responsibility as assemblePrompt/runGeneration).
  prompt: string;
}

// Shared core behind SOP and Playbook generation (Confirmed Decision 7 of
// the EKS V2 plan): parse -> Zod -> heading-match check, parameterized by
// the caller's required-headings list and prompt rather than duplicated
// per content type — this is the one piece of that pipeline where
// duplication risk (missing the SEC-02 check in a future content type)
// outweighs this codebase's usual per-file-duplication convention.
// Reuses headingsMatchRequiredSections from generation/run.ts rather than
// redefining it, for the same reason.
export async function generateStructuredDoc(input: GenerateStructuredDocInput): Promise<StructuredDocContent> {
  const raw = await generateCompletion(input.prompt);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new StructuredDocGenerationError("AI response was not valid JSON");
  }

  const validated = structuredDocContentSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new StructuredDocGenerationError(
      `AI response did not match the expected section schema: ${validated.error.message}`,
    );
  }

  const actualHeadings = validated.data.sections.map((s) => s.heading);
  const requiredHeadings = [...input.requiredHeadings];
  if (!headingsMatchRequiredSections(actualHeadings, requiredHeadings)) {
    throw new StructuredDocGenerationError(
      `AI response used different sections than requested — expected [${requiredHeadings.join(", ")}], got [${actualHeadings.join(", ")}]`,
    );
  }

  return validated.data;
}
