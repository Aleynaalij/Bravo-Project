import { describe, expect, it } from "vitest";
import { computeCrossSellSummary } from "./cross-sell";
import type { ServiceType } from "@/lib/domain/enums";

function services(...types: ServiceType[]): Set<ServiceType> {
  return new Set(types);
}

describe("computeCrossSellSummary", () => {
  it("finds no pairs when no account has more than one service", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp")],
        ["acct-2", services("retention")],
      ]),
      new Map(),
    );
    expect(summary.topPairs).toEqual([]);
    expect(summary.opportunities).toEqual([]);
  });

  it("requires a pairing to appear for at least 2 accounts before counting it as a pattern", () => {
    const summary = computeCrossSellSummary(
      new Map([["acct-1", services("dlp", "retention")]]),
      new Map(),
    );
    expect(summary.topPairs).toEqual([]);
  });

  it("counts a pairing once a second account has both services too", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
      ]),
      new Map(),
    );
    expect(summary.topPairs).toEqual([{ serviceA: "dlp", serviceB: "retention", accountCount: 2 }]);
  });

  it("flags an account missing one side of a common pairing as an opportunity", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
        ["acct-3", services("dlp")],
      ]),
      new Map([["acct-3", "Acme Corp"]]),
    );
    expect(summary.opportunities).toEqual([
      {
        accountId: "acct-3",
        accountLabel: "Acme Corp",
        hasService: "dlp",
        missingService: "retention",
        pairStrength: 2,
      },
    ]);
  });

  it("does not flag an account that has both services, or neither", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
        ["acct-3", services("dlp", "retention")],
        ["acct-4", services("sharepoint")],
      ]),
      new Map(),
    );
    expect(summary.opportunities).toEqual([]);
  });

  it("falls back to the account id when no label is provided", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
        ["acct-3", services("retention")],
      ]),
      new Map(),
    );
    expect(summary.opportunities[0].accountLabel).toBe("acct-3");
  });

  it("sorts pairs by account count descending", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
        ["acct-3", services("sharepoint", "analytics_ai")],
        ["acct-4", services("sharepoint", "analytics_ai")],
        ["acct-5", services("sharepoint", "analytics_ai")],
      ]),
      new Map(),
    );
    expect(summary.topPairs[0]).toEqual({ serviceA: "analytics_ai", serviceB: "sharepoint", accountCount: 3 });
    expect(summary.topPairs[1]).toEqual({ serviceA: "dlp", serviceB: "retention", accountCount: 2 });
  });

  it("sorts opportunities by the strength of the underlying pairing, then by account label", () => {
    const summary = computeCrossSellSummary(
      new Map([
        ["acct-1", services("dlp", "retention")],
        ["acct-2", services("dlp", "retention")],
        ["acct-3", services("dlp")], // weak-pairing gap (strength 2)
        ["acct-4", services("sharepoint", "analytics_ai")],
        ["acct-5", services("sharepoint", "analytics_ai")],
        ["acct-6", services("sharepoint", "analytics_ai")],
        ["acct-7", services("sharepoint")], // strong-pairing gap (strength 3)
      ]),
      new Map([
        ["acct-3", "Weak Pair Co"],
        ["acct-7", "Strong Pair Co"],
      ]),
    );
    expect(summary.opportunities.map((o) => o.accountLabel)).toEqual(["Strong Pair Co", "Weak Pair Co"]);
  });
});
