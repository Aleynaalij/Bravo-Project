import { describe, expect, it } from "vitest";
import {
  aggregateSecurityScore,
  computeMfaCoverageCheck,
  computeSingleOwnerCheck,
  unavailableMfaCoverageCheck,
} from "./score";

describe("computeSingleOwnerCheck", () => {
  it("is not applicable for a solo account", () => {
    const check = computeSingleOwnerCheck(1, 1);
    expect(check.status).toBe("pass");
    expect(check.points).toBe(100);
    expect(check.detail).toContain("Solo account");
  });

  it("fails when a multi-person team has only one owner", () => {
    const check = computeSingleOwnerCheck(4, 1);
    expect(check.status).toBe("fail");
    expect(check.points).toBe(0);
  });

  it("passes when a multi-person team has more than one owner", () => {
    const check = computeSingleOwnerCheck(4, 2);
    expect(check.status).toBe("pass");
    expect(check.points).toBe(100);
    expect(check.detail).toContain("2 of 4");
  });
});

describe("computeMfaCoverageCheck", () => {
  it("passes at full coverage", () => {
    const check = computeMfaCoverageCheck(3, 3);
    expect(check.status).toBe("pass");
    expect(check.points).toBe(100);
  });

  it("fails and reports partial coverage", () => {
    const check = computeMfaCoverageCheck(4, 1);
    expect(check.status).toBe("fail");
    expect(check.points).toBe(25);
    expect(check.detail).toContain("1 of 4");
  });

  it("does not divide by zero for an empty team", () => {
    const check = computeMfaCoverageCheck(0, 0);
    expect(check.points).toBe(100);
  });
});

describe("aggregateSecurityScore", () => {
  it("averages points across checks", () => {
    const score = aggregateSecurityScore([
      computeSingleOwnerCheck(4, 1), // 0
      computeMfaCoverageCheck(4, 2), // 50
    ]);
    expect(score).toBe(25);
  });

  it("excludes unavailable checks from the average", () => {
    const score = aggregateSecurityScore([
      computeSingleOwnerCheck(4, 2), // 100
      unavailableMfaCoverageCheck(), // excluded
    ]);
    expect(score).toBe(100);
  });

  it("defaults to 100 when every check is unavailable", () => {
    expect(aggregateSecurityScore([unavailableMfaCoverageCheck()])).toBe(100);
  });
});
