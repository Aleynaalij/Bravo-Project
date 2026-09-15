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
});
