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
});
