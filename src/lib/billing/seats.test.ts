import { describe, expect, it } from "vitest";
import { getSeatLimit } from "./seats";

describe("getSeatLimit", () => {
  it("caps the consultant plan at 1 seat — matches its own solo positioning", () => {
    expect(getSeatLimit("consultant")).toBe(1);
  });

  it("caps a trial (no active subscription) account at 1 seat", () => {
    expect(getSeatLimit("trial")).toBe(1);
  });

  it("gives the professional plan a larger, but still bounded, cap", () => {
    const limit = getSeatLimit("professional");
    expect(limit).toBeGreaterThan(1);
    expect(Number.isFinite(limit)).toBe(true);
  });

  it("falls back to the safest (1-seat) cap for an unrecognized plan value", () => {
    expect(getSeatLimit("canceled")).toBe(1);
    expect(getSeatLimit("")).toBe(1);
  });
});
