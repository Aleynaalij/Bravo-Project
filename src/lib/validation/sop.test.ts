import { describe, expect, it } from "vitest";
import { SOP_REQUIRED_HEADINGS, buildSopContent } from "./sop";

function fullParagraphs(): Record<string, string> {
  const entries = SOP_REQUIRED_HEADINGS.map((heading) => [heading, `${heading} paragraph one.`]);
  return Object.fromEntries(entries);
}

describe("buildSopContent", () => {
  it("builds one section per required heading, in the fixed order", () => {
    const content = buildSopContent(fullParagraphs());
    expect(content).not.toBeNull();
    expect(content!.sections.map((s) => s.heading)).toEqual([...SOP_REQUIRED_HEADINGS]);
  });

  it("splits a heading's text into paragraphs on blank lines", () => {
    const input = fullParagraphs();
    input["Purpose"] = "First paragraph.\n\nSecond paragraph.";
    const content = buildSopContent(input);
    expect(content!.sections[0].paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("returns null when a required heading was left empty", () => {
    const input = fullParagraphs();
    input["Escalation"] = "";
    expect(buildSopContent(input)).toBeNull();
  });

  it("returns null when a heading's text is only whitespace", () => {
    const input = fullParagraphs();
    input["References"] = "   \n\n  ";
    expect(buildSopContent(input)).toBeNull();
  });
});
