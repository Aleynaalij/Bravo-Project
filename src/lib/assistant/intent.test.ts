import { describe, expect, it } from "vitest";
import { isGenerateSopRequest, inferSopType, deriveSopTitle } from "./intent";

describe("isGenerateSopRequest", () => {
  it("matches a generate-verb + sop-noun combination", () => {
    expect(isGenerateSopRequest("Can you generate an SOP for this?")).toBe(true);
    expect(isGenerateSopRequest("write this up as a standard operating procedure")).toBe(true);
    expect(isGenerateSopRequest("turn this into a procedure document")).toBe(true);
  });

  it("does not match a plain question with no generate verb", () => {
    expect(isGenerateSopRequest("How do I configure a DLP policy?")).toBe(false);
  });

  it("does not match a generate verb with no sop noun", () => {
    expect(isGenerateSopRequest("Can you generate a summary of that?")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isGenerateSopRequest("GENERATE AN SOP FOR THIS")).toBe(true);
  });
});

describe("inferSopType", () => {
  it("matches dlp_administration from DLP-related text", () => {
    expect(inferSopType("We discussed data loss prevention policies and DLP rollout")).toBe("dlp_administration");
  });

  it("matches retention from retention-related text", () => {
    expect(inferSopType("How do retention labels work?")).toBe("retention");
  });

  it("matches ediscovery from litigation hold text", () => {
    expect(inferSopType("Setting up a legal hold for eDiscovery")).toBe("ediscovery");
  });

  it("falls back to daily_operations when nothing matches", () => {
    expect(inferSopType("Some unrelated conversation about nothing specific")).toBe("daily_operations");
  });
});

describe("deriveSopTitle", () => {
  it("prefixes the cleaned first message with SOP:", () => {
    expect(deriveSopTitle("How do I set up a DLP policy?")).toBe("SOP: How do I set up a DLP policy");
  });

  it("collapses whitespace", () => {
    expect(deriveSopTitle("How   do I   set this up?")).toBe("SOP: How do I set this up");
  });

  it("truncates an overly long message", () => {
    const long = "a".repeat(200);
    const title = deriveSopTitle(long);
    expect(title.length).toBeLessThan(120);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back to a generic title for an empty message", () => {
    expect(deriveSopTitle("   ")).toBe("SOP: Untitled procedure");
  });
});
