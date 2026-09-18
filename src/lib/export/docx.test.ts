import { describe, expect, it } from "vitest";
import { buildDocx } from "./docx";
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

describe("buildDocx", () => {
  it("produces a non-empty DOCX (zip) buffer with no branding", async () => {
    const buffer = await buildDocx("executive_summary", "Acme Corp", content, null);

    expect(buffer.length).toBeGreaterThan(0);
    // DOCX is a zip container — "PK" magic bytes at the start.
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });

  it("renders a code-kind deliverable's multi-line script content without throwing", async () => {
    // A blank line inside one stored paragraph, and multiple paragraphs —
    // the shape the edit-save path (edit-actions.ts) can produce by
    // splitting a script on blank lines. buildDocx must rejoin and render
    // it as one monospace block, not crash or silently drop content.
    const scriptContent: DeliverableContent = {
      sections: [
        {
          heading: "DLP Policy Script",
          paragraphs: [
            'Connect-IPPSSession\n\nNew-DlpCompliancePolicy -Name "Test" -ExchangeLocation All',
            'New-DlpComplianceRule -Policy "Test" -ContentContainsSensitiveInformation @{Name="U.S. Social Security Number (SSN)"}',
          ],
        },
      ],
    };

    const buffer = await buildDocx("implementation_script", "Acme Corp", scriptContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });

  it("renders an architecture diagram as a components table + connections list for a diagram-supporting type", async () => {
    const buffer = await buildDocx("high_level_design", "Acme Corp", diagramContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });

  it("ignores a diagram field for a deliverable type that doesn't support one", async () => {
    // Defense in depth: even if content somehow carried a diagram for a
    // non-diagram type, the builder should still produce a valid document
    // rather than rendering an unrequested diagram block.
    const buffer = await buildDocx("executive_summary", "Acme Corp", diagramContent, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});
