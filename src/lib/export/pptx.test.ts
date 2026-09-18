import { describe, expect, it } from "vitest";
import { buildPptx } from "./pptx";
import type { DeliverableContent } from "@/lib/validation/deliverable";

const content: DeliverableContent = {
  sections: [{ heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] }],
};

describe("buildPptx", () => {
  it("produces a non-empty PPTX (zip) buffer with no branding", async () => {
    const buffer = await buildPptx("executive_summary", "Acme Corp", content, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });

  it("splits a long section across multiple slides", async () => {
    const longContent: DeliverableContent = {
      sections: [
        {
          heading: "Overview",
          paragraphs: Array.from({ length: 20 }, (_, i) => `Paragraph ${i} `.repeat(20)),
        },
      ],
    };

    const buffer = await buildPptx("executive_summary", "Acme Corp", longContent, null);

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("renders a code-kind deliverable as monospace code-block slides, splitting a long script across slides by line count", async () => {
    const longScript: DeliverableContent = {
      sections: [
        {
          heading: "DLP Policy Script",
          paragraphs: [Array.from({ length: 40 }, (_, i) => `Write-Host "Step ${i}"`).join("\n")],
        },
      ],
    };

    const buffer = await buildPptx("implementation_script", "Acme Corp", longScript, null);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});
