import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { deliverableSectionSchema } from "@/lib/validation/deliverable";

export const PLAYBOOK_TYPES = [
  "dlp_deployment",
  "records_management",
  "insider_risk",
  "communication_compliance",
  "ediscovery",
  "information_protection",
] as const;
export type PlaybookType = (typeof PLAYBOOK_TYPES)[number];

export const PLAYBOOK_TYPE_LABELS: Record<PlaybookType, string> = {
  dlp_deployment: "DLP Deployment",
  records_management: "Records Management",
  insider_risk: "Insider Risk",
  communication_compliance: "Communication Compliance",
  ediscovery: "eDiscovery",
  information_protection: "Information Protection",
};

export const PLAYBOOK_STATUSES = ["draft", "published"] as const;
export type PlaybookStatus = (typeof PLAYBOOK_STATUSES)[number];

// Fixed section order every playbook follows — a deployment project walked
// through phases, unlike an SOP's operational-procedure headings
// (SOP_REQUIRED_HEADINGS in validation/sop.ts). Same "manual form renders
// one field per heading, so the structure holds by construction" rationale
// as SOPs — see that file's doc comment for the full explanation.
export const PLAYBOOK_REQUIRED_HEADINGS = [
  "Discovery",
  "Requirements",
  "Planning",
  "Design",
  "Implementation",
  "Testing",
  "Pilot",
  "Rollout",
  "Monitoring",
  "Operations",
  "Success Criteria",
  "Lessons Learned",
] as const;

// Reuses deliverableSectionSchema rather than redefining an identical
// {heading, paragraphs} shape (Confirmed Decision 7 in the EKS V2 plan).
export const playbookContentSchema = z.object({
  sections: z.array(deliverableSectionSchema).length(PLAYBOOK_REQUIRED_HEADINGS.length),
});
export type PlaybookContent = z.infer<typeof playbookContentSchema>;

// Turns the manual form's one-textarea-per-heading input into validated
// PlaybookContent — same blank-line-separated-paragraphs convention as
// buildSopContent (validation/sop.ts) and [projectId]/edit-actions.ts's
// saveEditedVersionAction.
export function buildPlaybookContent(paragraphsByHeading: Record<string, string>): PlaybookContent | null {
  const sections = PLAYBOOK_REQUIRED_HEADINGS.map((heading) => ({
    heading,
    paragraphs: (paragraphsByHeading[heading] ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  }));
  const parsed = playbookContentSchema.safeParse({ sections });
  return parsed.success ? parsed.data : null;
}

export const playbookInputSchema = z.object({
  playbookType: z.enum(PLAYBOOK_TYPES),
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  status: z.enum(PLAYBOOK_STATUSES),
  content: playbookContentSchema,
});
export type PlaybookInput = z.infer<typeof playbookInputSchema>;

// Input to src/lib/playbook/generate.ts's generatePlaybook — mirrors
// sopGenerateRequestSchema exactly.
export const playbookGenerateRequestSchema = z.object({
  playbookType: z.enum(PLAYBOOK_TYPES),
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  context: z.string().max(4000),
  sourceProjectId: z.string().uuid().nullable(),
});
export type PlaybookGenerateRequestInput = z.infer<typeof playbookGenerateRequestSchema>;
