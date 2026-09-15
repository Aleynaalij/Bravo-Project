import { describe, expect, it } from "vitest";
import { deliverableContentSchema } from "./deliverable";

describe("deliverableContentSchema", () => {
  it("accepts a well-formed AI response", () => {
    const result = deliverableContentSchema.safeParse({
      sections: [{ heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a response with no sections", () => {
    const result = deliverableContentSchema.safeParse({ sections: [] });

    expect(result.success).toBe(false);
  });

  it("rejects a section with an empty heading", () => {
    const result = deliverableContentSchema.safeParse({
      sections: [{ heading: "", paragraphs: ["Some text."] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a section with no paragraphs", () => {
    const result = deliverableContentSchema.safeParse({
      sections: [{ heading: "Overview", paragraphs: [] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a section with an empty-string paragraph", () => {
    const result = deliverableContentSchema.safeParse({
      sections: [{ heading: "Overview", paragraphs: [""] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-object input entirely (e.g. the model returning a bare string)", () => {
    const result = deliverableContentSchema.safeParse("not an object");

    expect(result.success).toBe(false);
  });
});
