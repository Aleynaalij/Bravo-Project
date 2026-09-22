import { describe, expect, it } from "vitest";
import { normalizeTags } from "./vault";

describe("normalizeTags", () => {
  it("splits a comma-separated string into trimmed tags", () => {
    expect(normalizeTags("DLP, Teams , Retention")).toEqual(["dlp", "teams", "retention"]);
  });

  it("lowercases every tag", () => {
    expect(normalizeTags("DLP,Teams")).toEqual(["dlp", "teams"]);
  });

  it("drops empty segments from stray commas", () => {
    expect(normalizeTags("dlp,,teams,")).toEqual(["dlp", "teams"]);
  });

  it("deduplicates repeated tags", () => {
    expect(normalizeTags("dlp, DLP, dlp ")).toEqual(["dlp"]);
  });

  it("returns an empty array for blank input", () => {
    expect(normalizeTags("")).toEqual([]);
    expect(normalizeTags("   ")).toEqual([]);
  });

  it("returns a single tag unchanged for input with no commas", () => {
    expect(normalizeTags("sharepoint")).toEqual(["sharepoint"]);
  });
});
