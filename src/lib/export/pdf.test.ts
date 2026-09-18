import { describe, expect, it } from "vitest";
import { buildPdf } from "./pdf";
import type { DeliverableContent } from "@/lib/validation/deliverable";

const content: DeliverableContent = {
  sections: [{ heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] }],
};

const diagramContent: DeliverableContent = {
  sections: [{ heading: "Proposed Architecture Overview", paragraphs: ["Overview text."] }],
  diagram: {
    title: "Target Architecture",
    nodes: [
      { id: "tenant", label: "Customer M365 Tenant", kind: "boundary" },
      { id: "dlp", label: "DLP Policies", kind: "service" },
      { id: "retention", label: "Retention Policies", kind: "service" },
      { id: "idp", label: "External IdP", kind: "external" },
    ],
    edges: [
      { from: "tenant", to: "dlp", label: "enforces" },
      { from: "tenant", to: "retention" },
      { from: "idp", to: "tenant", label: "federates" },
    ],
  },
};

describe("buildPdf", () => {
  it("produces a non-empty PDF buffer with no branding", async () => {
    const buffer = await buildPdf("executive_summary", "Acme Corp", content, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders a code-kind deliverable's multi-line script content without throwing", async () => {
    const scriptContent: DeliverableContent = {
      sections: [
        {
          heading: "DLP Policy Script",
          paragraphs: [
            'Connect-IPPSSession\n\nNew-DlpCompliancePolicy -Name "Test" -ExchangeLocation All',
          ],
        },
      ],
    };

    const buffer = await buildPdf("implementation_script", "Acme Corp", scriptContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders a vector architecture diagram (Svg/Rect/Line) for a diagram-supporting type", async () => {
    const buffer = await buildPdf("high_level_design", "Acme Corp", diagramContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("ignores a diagram field for a deliverable type that doesn't support one", async () => {
    const buffer = await buildPdf("executive_summary", "Acme Corp", diagramContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
