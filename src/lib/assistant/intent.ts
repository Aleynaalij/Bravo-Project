import type { SopType } from "@/lib/validation/sop";

// Matches the question+answer text against each SOP type's own label —
// e.g. a question about "DLP policy" naturally lands on
// dlp_administration, a question about "retention labels" lands on
// retention. Falls back to daily_operations (the most general type) when
// nothing matches, rather than failing generation outright — a
// slightly-off category is a minor mismatch the consultant can fix by
// editing the SOP afterward, not a reason to block generation.
const SOP_TYPE_KEYWORDS: Record<SopType, string[]> = {
  daily_operations: ["daily operations", "day to day", "day-to-day"],
  dlp_administration: ["dlp", "data loss prevention"],
  label_management: ["sensitivity label", "label management", "labeling"],
  retention: ["retention"],
  ediscovery: ["ediscovery", "e-discovery", "litigation hold", "legal hold"],
  insider_risk: ["insider risk"],
  governance: ["governance", "information governance"],
  change_management: ["change management", "change control"],
  incident_response: ["incident response", "incident handling"],
  user_provisioning: ["provisioning", "onboarding", "offboarding"],
  escalation: ["escalation", "escalate"],
};

export function inferSopType(text: string): SopType {
  const lower = text.toLowerCase();
  for (const [sopType, keywords] of Object.entries(SOP_TYPE_KEYWORDS) as [SopType, string[]][]) {
    if (keywords.some((keyword) => lower.includes(keyword))) return sopType;
  }
  return "daily_operations";
}

const TITLE_MAX_LENGTH = 100;

// Derives a title from the original question rather than asking the
// model for one — one less thing that can fail Zod validation mid-
// generation, and a title based on the actual question reads more
// naturally than a model-invented one anyway.
export function deriveSopTitle(question: string): string {
  const cleaned = question.trim().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
  const truncated = cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : cleaned;
  return `SOP: ${truncated || "Untitled procedure"}`;
}
