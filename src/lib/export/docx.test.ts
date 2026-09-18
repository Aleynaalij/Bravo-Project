import { describe, expect, it } from "vitest";
import { buildDocx } from "./docx";
import type { DeliverableContent } from "@/lib/validation/deliverable";

const content: DeliverableContent = {
  sections: [{ heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] }],
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
});
