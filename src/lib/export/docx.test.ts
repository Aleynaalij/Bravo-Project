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
});
