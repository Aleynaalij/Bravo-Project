import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { deliverableSectionSchema } from "@/lib/validation/deliverable";

export const SOP_TYPES = [
  "daily_operations",
  "dlp_administration",
  "label_management",
  "retention",
  "ediscovery",
  "insider_risk",
  "governance",
  "change_management",
  "incident_response",
  "user_provisioning",
  "escalation",
] as const;
export type SopType = (typeof SOP_TYPES)[number];

export const SOP_TYPE_LABELS: Record<SopType, string> = {
  daily_operations: "Daily Operations",
  dlp_administration: "DLP Administration",
  label_management: "Label Management",
  retention: "Retention",
  ediscovery: "eDiscovery",
  insider_risk: "Insider Risk",
  governance: "Governance",
  change_management: "Change Management",
  incident_response: "Incident Response",
  user_provisioning: "User Provisioning",
  escalation: "Escalation",
};

export const SOP_STATUSES = ["draft", "published"] as const;
export type SopStatus = (typeof SOP_STATUSES)[number];

// Fixed section order every SOP follows, regardless of sop_type. The
// manual-entry form (sop-form.tsx) renders one field per heading rather
// than letting a user type arbitrary headings, so a saved SOP satisfies
// this by construction — no separate structural check needed here, unlike
// generation/run.ts's headingsMatchRequiredSections (SEC-02), which exists
// because an AI response isn't structurally guaranteed the way a fixed
// form is. The shared generation engine (src/lib/generation/structured-
// doc.ts, step 3 of this phase) reuses this same list and runs that check
// against it.
export const SOP_REQUIRED_HEADINGS = [
  "Purpose",
  "Scope",
  "Roles",
  "Responsibilities",
  "Prerequisites",
  "Procedure",
  "Validation",
  "Exception Handling",
  "Reporting",
  "Escalation",
  "References",
  "Revision History",
] as const;

// Reuses deliverableSectionSchema rather than redefining an identical
// {heading, paragraphs} shape (Confirmed Decision 7 in the EKS V2 plan).
export const sopContentSchema = z.object({
  sections: z.array(deliverableSectionSchema).length(SOP_REQUIRED_HEADINGS.length),
});
export type SopContent = z.infer<typeof sopContentSchema>;

// Turns the manual form's one-textarea-per-heading input into validated
// SopContent — same blank-line-separated-paragraphs convention as
// [projectId]/edit-actions.ts's saveEditedVersionAction. Returns null
// (rather than throwing) when a required heading was left empty, so the
// caller can surface a friendly form error.
export function buildSopContent(paragraphsByHeading: Record<string, string>): SopContent | null {
  const sections = SOP_REQUIRED_HEADINGS.map((heading) => ({
    heading,
    paragraphs: (paragraphsByHeading[heading] ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  }));
  const parsed = sopContentSchema.safeParse({ sections });
  return parsed.success ? parsed.data : null;
}

export const sopInputSchema = z.object({
  sopType: z.enum(SOP_TYPES),
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  status: z.enum(SOP_STATUSES),
  content: sopContentSchema,
});
export type SopInput = z.infer<typeof sopInputSchema>;

// Input to src/lib/sop/generate.ts's generateSop — a freeform description
// of what this SOP should cover (environment specifics, tools, anything
// the account wants reflected), not the content itself. context reaches
// the AI prompt wrapped in a rotating untrusted-data tag, same SEC-02
// treatment as every other account-authored free-text field that reaches
// a prompt in this app.
export const sopGenerateRequestSchema = z.object({
  sopType: z.enum(SOP_TYPES),
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES).nullable(),
  context: z.string().max(4000),
  sourceProjectId: z.string().uuid().nullable(),
});
export type SopGenerateRequestInput = z.infer<typeof sopGenerateRequestSchema>;
