import { describe, expect, it } from "vitest";
import { assemblePrompt } from "./prompt";
import type { KnowledgeBaseEntryRow, PromptTemplateRow } from "./types";
import type { ProjectRow } from "@/lib/projects/service";

const template: PromptTemplateRow = {
  id: "template-1",
  deliverable_type: "executive_summary",
  version: 1,
  template_body: "You are drafting an executive summary.",
  section_schema: [
    { key: "overview", heading: "Overview", always: true },
    { key: "dlp", heading: "DLP Findings", requires_service: "dlp" },
    { key: "retention", heading: "Retention Findings", requires_service: "retention" },
  ],
};

const project: ProjectRow = {
  id: "project-1",
  account_id: "account-1",
  customer_name: "Acme Corp",
  industry: "Healthcare",
  user_count: 250,
  licensing_tier: "E5",
  geographic_locations: ["US", "EU"],
  compliance_notes: "HIPAA applies.",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const kbEntries: KnowledgeBaseEntryRow[] = [
  {
    id: "kb-1",
    title: "DLP baseline",
    service_type: "dlp",
    industry: null,
    content: "Apply the standard DLP policy set.",
    source_url: null,
  },
];

describe("assemblePrompt", () => {
  it("includes only sections whose required service is in scope", () => {
    const prompt = assemblePrompt(template, project, ["dlp"], kbEntries);

    expect(prompt).toContain("1. Overview");
    expect(prompt).toContain("2. DLP Findings");
    expect(prompt).not.toContain("Retention Findings");
  });

  it("includes project context and the knowledge base block", () => {
    const prompt = assemblePrompt(template, project, ["dlp"], kbEntries);

    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("Healthcare");
    expect(prompt).toContain("HIPAA applies.");
    expect(prompt).toContain("Apply the standard DLP policy set.");
  });

  it("falls back to a placeholder when there are no matching KB entries", () => {
    const prompt = assemblePrompt(template, project, ["dlp"], []);

    expect(prompt).toContain("(no matching Knowledge Base entries)");
  });

  it("instructs the model to respond with the required JSON shape", () => {
    const prompt = assemblePrompt(template, project, ["dlp"], kbEntries);

    expect(prompt).toContain('{"sections": [{"heading": string, "paragraphs": string[]}, ...]}');
  });
});
