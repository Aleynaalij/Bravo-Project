import { describe, expect, it } from "vitest";
import { rankByTextMatch, filterByAuthorId } from "./search";

interface Row {
  id: string;
  text: string;
}

const row = (id: string, text: string): Row => ({ id, text });

interface AuthoredRow {
  id: string;
  authorUserId: string | null;
}

const authoredRow = (id: string, authorUserId: string | null): AuthoredRow => ({ id, authorUserId });

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

describe("filterByAuthorId", () => {
  it("returns every row unchanged when no author is selected", () => {
    const rows = [authoredRow("a", "user-1"), authoredRow("b", "user-2")];
    expect(filterByAuthorId(rows, null, (r) => r.authorUserId)).toEqual(rows);
  });

  it("keeps only rows authored by the selected user", () => {
    const rows = [authoredRow("a", "user-1"), authoredRow("b", "user-2"), authoredRow("c", "user-1")];
    const result = filterByAuthorId(rows, "user-1", (r) => r.authorUserId);
    expect(result.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("excludes rows with no author when filtering by a specific user", () => {
    const rows = [authoredRow("a", "user-1"), authoredRow("b", null)];
    const result = filterByAuthorId(rows, "user-1", (r) => r.authorUserId);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("returns an empty array when nobody matches the selected author", () => {
    const rows = [authoredRow("a", "user-1"), authoredRow("b", "user-2")];
    expect(filterByAuthorId(rows, "user-3", (r) => r.authorUserId)).toEqual([]);
  });
});
