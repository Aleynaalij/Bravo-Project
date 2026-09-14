import type { ServiceType } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import type { ProjectRow } from "@/lib/projects/service";
import type { KnowledgeBaseEntryRow, PromptTemplateRow } from "./types";

export function assemblePrompt(
  template: PromptTemplateRow,
  project: ProjectRow,
  services: ServiceType[],
  kbEntries: KnowledgeBaseEntryRow[],
): string {
  const applicableSections = template.section_schema.filter(
    (s) => s.always || (s.requires_service && services.includes(s.requires_service)),
  );

  const kbBlock =
    kbEntries.length > 0
      ? kbEntries
          .map((e) => `- [${SERVICE_LABELS[e.service_type]}] ${e.title}: ${e.content}`)
          .join("\n")
      : "(no matching Knowledge Base entries)";

  return `${template.template_body}

---
PROJECT CONTEXT
Customer: ${project.customer_name}
Industry: ${project.industry}
User count: ${project.user_count}
Licensing tier: ${project.licensing_tier}
Geographic locations: ${project.geographic_locations.join(", ") || "not specified"}
Compliance notes: ${project.compliance_notes || "none provided"}
Services in scope: ${services.map((s) => SERVICE_LABELS[s]).join(", ")}

KNOWLEDGE BASE REFERENCE ENTRIES
${kbBlock}

REQUIRED SECTIONS (produce exactly these, in this order, nothing else)
${applicableSections.map((s, i) => `${i + 1}. ${s.heading}`).join("\n")}

Respond with a single JSON object: {"sections": [{"heading": string, "paragraphs": string[]}, ...]} — one entry per required section above, in order. No text outside the JSON object.`;
}
