import { describe, expect, it } from "vitest";
import { PLAYBOOK_REQUIRED_HEADINGS, buildPlaybookContent } from "./playbook";

function fullParagraphs(): Record<string, string> {
  const entries = PLAYBOOK_REQUIRED_HEADINGS.map((heading) => [heading, `${heading} paragraph one.`]);
  return Object.fromEntries(entries);
}

describe("buildPlaybookContent", () => {
  it("builds one section per required heading, in the fixed order", () => {
    const content = buildPlaybookContent(fullParagraphs());
    expect(content).not.toBeNull();
    expect(content!.sections.map((s) => s.heading)).toEqual([...PLAYBOOK_REQUIRED_HEADINGS]);
  });

  it("splits a heading's text into paragraphs on blank lines", () => {
    const input = fullParagraphs();
    input["Discovery"] = "First paragraph.\n\nSecond paragraph.";
    const content = buildPlaybookContent(input);
    expect(content!.sections[0].paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("returns null when a required heading was left empty", () => {
    const input = fullParagraphs();
    input["Rollout"] = "";
    expect(buildPlaybookContent(input)).toBeNull();
  });

  it("returns null when a heading's text is only whitespace", () => {
    const input = fullParagraphs();
    input["Lessons Learned"] = "   \n\n  ";
    expect(buildPlaybookContent(input)).toBeNull();
  });
});
