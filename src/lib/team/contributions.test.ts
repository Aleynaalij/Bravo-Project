import { describe, expect, it } from "vitest";
import { summarizeContributionCounts } from "./contributions";

describe("summarizeContributionCounts", () => {
  it("returns an empty list for no rows", () => {
    expect(summarizeContributionCounts([])).toEqual([]);
  });

  it("counts one contribution per row, ranked highest first", () => {
    const result = summarizeContributionCounts([
      { author_email: "alice@example.com" },
      { author_email: "bob@example.com" },
      { author_email: "alice@example.com" },
      { author_email: "alice@example.com" },
    ]);
    expect(result).toEqual([
      { authorEmail: "alice@example.com", count: 3 },
      { authorEmail: "bob@example.com", count: 1 },
    ]);
  });

  it("merges rows from every content type into one per-author total", () => {
    const vaultEntries = [{ author_email: "alice@example.com" }];
    const scripts = [{ author_email: "alice@example.com" }];
    const sops = [{ author_email: "bob@example.com" }];
    const playbooks = [{ author_email: "bob@example.com" }, { author_email: "bob@example.com" }];
    const result = summarizeContributionCounts([...vaultEntries, ...scripts, ...sops, ...playbooks]);
    expect(result).toEqual([
      { authorEmail: "bob@example.com", count: 3 },
      { authorEmail: "alice@example.com", count: 2 },
    ]);
  });
});
