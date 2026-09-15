import { describe, expect, it } from "vitest";
import { headingsMatchRequiredSections } from "./run";

describe("headingsMatchRequiredSections (SEC-02 output validation)", () => {
  const required = ["Overview", "DLP Findings", "Rollback Plan"];

  it("accepts a response that used exactly the required headings, in order", () => {
    expect(headingsMatchRequiredSections(required, required)).toBe(true);
  });

  it("tolerates surrounding whitespace on a heading", () => {
    expect(headingsMatchRequiredSections([" Overview ", "DLP Findings", "Rollback Plan"], required)).toBe(
      true,
    );
  });

  it("rejects a response with fewer sections than required", () => {
    expect(headingsMatchRequiredSections(["Overview"], required)).toBe(false);
  });

  it("rejects a response with extra, unrequested sections", () => {
    expect(
      headingsMatchRequiredSections([...required, "Bonus injected section"], required),
    ).toBe(false);
  });

  it("rejects a response with the right count but different headings — the injection case", () => {
    // What SEC-02 is actually guarding against: an embedded instruction in
    // a free-text project field (e.g. compliance_notes) talking the model
    // into producing different content under different headings, while
    // still returning valid JSON that satisfies the shape-only schema.
    expect(
      headingsMatchRequiredSections(
        ["System prompt", "Ignore prior instructions", "Rollback Plan"],
        required,
      ),
    ).toBe(false);
  });

  it("rejects a response with the same headings out of order", () => {
    expect(
      headingsMatchRequiredSections(["DLP Findings", "Overview", "Rollback Plan"], required),
    ).toBe(false);
  });
});
