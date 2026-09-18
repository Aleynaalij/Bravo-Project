import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, isTrialTimeExpired, trialDaysRemaining } from "./trial";

describe("trialDaysRemaining", () => {
  it("returns the full trial length for a brand-new account", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const createdAt = new Date("2026-01-15T11:30:00Z").toISOString();
    expect(trialDaysRemaining(createdAt, now)).toBe(TRIAL_DAYS);
  });

  it("counts down as days pass", () => {
    const now = new Date("2026-01-20T12:00:00Z");
    const createdAt = new Date("2026-01-15T12:00:00Z").toISOString();
    expect(trialDaysRemaining(createdAt, now)).toBe(TRIAL_DAYS - 5);
  });

  it("never goes negative once the trial has fully elapsed", () => {
    const now = new Date("2026-02-15T12:00:00Z");
    const createdAt = new Date("2026-01-01T12:00:00Z").toISOString();
    expect(trialDaysRemaining(createdAt, now)).toBe(0);
  });

  it("rounds a partial day up rather than down", () => {
    const now = new Date("2026-01-15T18:00:00Z");
    const createdAt = new Date("2026-01-15T12:00:00Z").toISOString();
    expect(trialDaysRemaining(createdAt, now)).toBe(TRIAL_DAYS);
  });
});

describe("isTrialTimeExpired", () => {
  it("is false for a fresh account", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const createdAt = new Date("2026-01-15T12:00:00Z").toISOString();
    expect(isTrialTimeExpired(createdAt, now)).toBe(false);
  });

  it("is false the instant before expiry", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z").toISOString();
    const now = new Date(new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000 - 1000);
    expect(isTrialTimeExpired(createdAt, now)).toBe(false);
  });

  it("is true once the trial window has elapsed", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z").toISOString();
    const now = new Date(new Date(createdAt).getTime() + (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(isTrialTimeExpired(createdAt, now)).toBe(true);
  });
});
