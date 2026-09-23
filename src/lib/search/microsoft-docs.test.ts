import { describe, expect, it } from "vitest";
import { parseMicrosoftDocsSearchResult } from "./microsoft-docs";

describe("parseMicrosoftDocsSearchResult", () => {
  it("returns [] for a missing or malformed result", () => {
    expect(parseMicrosoftDocsSearchResult(undefined)).toEqual([]);
    expect(parseMicrosoftDocsSearchResult(null)).toEqual([]);
    expect(parseMicrosoftDocsSearchResult("not an object")).toEqual([]);
    expect(parseMicrosoftDocsSearchResult({})).toEqual([]);
  });

  it("parses structuredContent when the tool declares an outputSchema", () => {
    const result = parseMicrosoftDocsSearchResult({
      content: [],
      structuredContent: {
        results: [
          { title: "Configure DLP policies", url: "https://learn.microsoft.com/purview/dlp-policies", snippet: "How to set up DLP." },
          { title: "Retention labels overview", url: "https://learn.microsoft.com/purview/retention", description: "Retention label basics." },
        ],
      },
    });
    expect(result).toEqual([
      { title: "Configure DLP policies", url: "https://learn.microsoft.com/purview/dlp-policies", snippet: "How to set up DLP." },
      { title: "Retention labels overview", url: "https://learn.microsoft.com/purview/retention", snippet: "Retention label basics." },
    ]);
  });

  it("skips structuredContent entries missing a title or url", () => {
    const result = parseMicrosoftDocsSearchResult({
      structuredContent: { results: [{ title: "No URL here" }, { url: "https://learn.microsoft.com/x" }] },
    });
    expect(result).toEqual([]);
  });

  it("falls back to parsing markdown links out of text content", () => {
    const result = parseMicrosoftDocsSearchResult({
      content: [
        {
          type: "text",
          text: "[Configure DLP policies](https://learn.microsoft.com/purview/dlp-policies)\nHow to set up DLP for Exchange and SharePoint.\n\n[Retention labels overview](https://learn.microsoft.com/purview/retention)\nRetention label basics and lifecycle.",
        },
      ],
    });
    expect(result).toEqual([
      {
        title: "Configure DLP policies",
        url: "https://learn.microsoft.com/purview/dlp-policies",
        snippet: "How to set up DLP for Exchange and SharePoint.",
      },
      {
        title: "Retention labels overview",
        url: "https://learn.microsoft.com/purview/retention",
        snippet: "Retention label basics and lifecycle.",
      },
    ]);
  });

  it("returns [] when text content has no markdown links", () => {
    const result = parseMicrosoftDocsSearchResult({
      content: [{ type: "text", text: "No results found for that query." }],
    });
    expect(result).toEqual([]);
  });

  it("truncates an overly long snippet", () => {
    const longSnippet = "x".repeat(400);
    const result = parseMicrosoftDocsSearchResult({
      content: [{ type: "text", text: `[Title](https://learn.microsoft.com/x)\n${longSnippet}` }],
    });
    expect(result[0].snippet.length).toBeLessThan(250);
    expect(result[0].snippet.endsWith("…")).toBe(true);
  });

  it("prefers structuredContent over text content when both are present", () => {
    const result = parseMicrosoftDocsSearchResult({
      content: [{ type: "text", text: "[Wrong entry](https://example.com/wrong)" }],
      structuredContent: { results: [{ title: "Right entry", url: "https://learn.microsoft.com/right", snippet: "" }] },
    });
    expect(result).toEqual([{ title: "Right entry", url: "https://learn.microsoft.com/right", snippet: "" }]);
  });
});
