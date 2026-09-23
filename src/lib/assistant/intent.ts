import type { SopType } from "@/lib/validation/sop";

// Deliberately a keyword heuristic, not a second AI call to classify
// intent — this runs on every single chat turn, and an extra model
// round-trip just to decide "is this a generate request" would double
// the latency and cost of the single most common path (plain Q&A) to
// serve the least common one. False negatives just mean Que answers the
// question instead of generating a doc, which is a safe, recoverable
// default; a false positive is unlikely given the phrase requires both a
// "make this into a doc" verb and the word "sop"/"procedure".
const GENERATE_VERB_PATTERN = /\b(generate|create|write|turn this into|make this|produce|draft)\b/i;
const SOP_NOUN_PATTERN = /\b(sop|standard operating procedure|procedure doc(ument)?)\b/i;

export function isGenerateSopRequest(message: string): boolean {
  return GENERATE_VERB_PATTERN.test(message) && SOP_NOUN_PATTERN.test(message);
}

// Matches the conversation so far against each SOP type's own label —
// e.g. a conversation about "DLP policy" naturally lands on
// dlp_administration, a conversation about "retention labels" lands on
// retention. Falls back to daily_operations (the most general type) when
// nothing matches, rather than failing the generation outright — a
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

export function inferSopType(conversationText: string): SopType {
  const lower = conversationText.toLowerCase();
  for (const [sopType, keywords] of Object.entries(SOP_TYPE_KEYWORDS) as [SopType, string[]][]) {
    if (keywords.some((keyword) => lower.includes(keyword))) return sopType;
  }
  return "daily_operations";
}

const TITLE_MAX_LENGTH = 100;

// Derives a title from the conversation's first user message rather than
// asking the model for one — one less thing that can fail Zod validation
// mid-generation, and a title based on the actual original question reads
// more naturally than a model-invented one anyway.
export function deriveSopTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
  const truncated = cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : cleaned;
  return `SOP: ${truncated || "Untitled procedure"}`;
}
