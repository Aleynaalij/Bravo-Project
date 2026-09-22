import { describe, expect, it } from "vitest";
import { rankByTextMatch } from "./search";

interface Row {
  id: string;
  text: string;
}

const row = (id: string, text: string): Row => ({ id, text });

describe("rankByTextMatch", () => {
  it("returns rows unchanged for a blank query", () => {
    const rows = [row("a", "DLP policy"), row("b", "Teams retention")];
    expect(rankByTextMatch(rows, "", (r) => r.text)).toEqual(rows);
    expect(rankByTextMatch(rows, "   ", (r) => r.text)).toEqual(rows);
  });

  it("drops rows that match none of the query terms", () => {
    const rows = [row("a", "DLP policy for Exchange"), row("b", "Teams retention labels")];
    const result = rankByTextMatch(rows, "dlp", (r) => r.text);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("ranks rows matching more query terms above rows matching fewer", () => {
    const rows = [
      row("one-term", "DLP policy for Exchange"),
      row("two-terms", "DLP policy fails in Teams specifically"),
    ];
    const result = rankByTextMatch(rows, "dlp teams", (r) => r.text);
    expect(result.map((r) => r.id)).toEqual(["two-terms", "one-term"]);
  });

  it("is case-insensitive", () => {
    const rows = [row("a", "DLP Policy For TEAMS")];
    expect(rankByTextMatch(rows, "dlp teams", (r) => r.text)).toEqual(rows);
  });

  it("returns an empty array when nothing matches", () => {
    const rows = [row("a", "DLP policy"), row("b", "Teams retention")];
    expect(rankByTextMatch(rows, "sharepoint", (r) => r.text)).toEqual([]);
  });
});
