import { describe, expect, it } from "vitest";
import { buildPdf } from "./pdf";
import type { DeliverableContent } from "@/lib/validation/deliverable";

const content: DeliverableContent = {
  sections: [{ heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] }],
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
});
