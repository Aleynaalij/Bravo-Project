import { describe, expect, it } from "vitest";
import { computeChangeRatio, classifyEditSeverity, extractDeliverableText } from "./quality";
import type { DeliverableContent } from "@/lib/validation/deliverable";

describe("extractDeliverableText", () => {
  it("flattens every section's paragraphs into one string", () => {
    const content: DeliverableContent = {
      sections: [
        { heading: "Overview", paragraphs: ["First paragraph.", "Second paragraph."] },
        { heading: "Scope", paragraphs: ["Third paragraph."] },
      ],
    };
    expect(extractDeliverableText(content)).toBe(
      "First paragraph. Second paragraph. Third paragraph.",
    );
  });
});

describe("computeChangeRatio", () => {
  it("is 0 for identical text", () => {
    expect(computeChangeRatio("the quick brown fox", "the quick brown fox")).toBe(0);
  });

  it("is close to 1 for completely disjoint text", () => {
    expect(computeChangeRatio("apple banana cherry", "dog elephant fox")).toBeCloseTo(1, 5);
  });

  it("is case-insensitive", () => {
    expect(computeChangeRatio("The Quick Fox", "the quick fox")).toBe(0);
  });

  it("gives a small ratio for a one-word tweak in a long document", () => {
    const original = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const edited = original.replace("word10", "changed");
    const ratio = computeChangeRatio(original, edited);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(0.05);
  });

  it("gives a large ratio when most of the document is rewritten", () => {
    const original = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const edited = Array.from({ length: 50 }, (_, i) => `new${i}`).join(" ");
    expect(computeChangeRatio(original, edited)).toBeGreaterThan(0.9);
  });

  it("handles both texts being empty without dividing by zero", () => {
    expect(computeChangeRatio("", "")).toBe(0);
  });
});

describe("classifyEditSeverity", () => {
  it("classifies a small change ratio as minor", () => {
    expect(classifyEditSeverity(0.02)).toBe("minor");
  });

  it("classifies a large change ratio as major", () => {
    expect(classifyEditSeverity(0.5)).toBe("major");
  });

  it("classifies exactly the threshold as major (inclusive boundary)", () => {
    expect(classifyEditSeverity(0.15)).toBe("major");
  });
});
