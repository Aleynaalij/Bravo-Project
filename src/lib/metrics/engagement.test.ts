import { describe, expect, it } from "vitest";
import { computeEngagementHealth } from "./engagement";

const NOW = new Date("2026-09-18T00:00:00Z");
const RECENT = "2026-09-17T00:00:00Z";
const OLD = "2026-09-01T00:00:00Z"; // 17 days before NOW

describe("computeEngagementHealth", () => {
  it("marks a recent project with no deliverables as review needed, not stalled", () => {
    expect(computeEngagementHealth([], RECENT, NOW)).toBe("review_needed");
  });

  it("marks an old project with no deliverables as stalled", () => {
    expect(computeEngagementHealth([], OLD, NOW)).toBe("stalled");
  });

  it("marks a project where everything attempted failed as stalled", () => {
    expect(computeEngagementHealth(["failed", "failed"], RECENT, NOW)).toBe("stalled");
  });

  it("marks a partial failure (some ready, some failed) as review needed, not stalled", () => {
    expect(computeEngagementHealth(["failed", "ready", "ready"], RECENT, NOW)).toBe("review_needed");
  });

  it("marks a project with nothing ready yet (all pending/generating) as review needed", () => {
    expect(computeEngagementHealth(["pending", "generating"], RECENT, NOW)).toBe("review_needed");
  });

  it("marks a project with at least one ready deliverable and no failures as healthy", () => {
    expect(computeEngagementHealth(["ready", "ready", "pending"], RECENT, NOW)).toBe("healthy");
  });

  it("an old project is judged the same as a recent one once it has any deliverable activity", () => {
    expect(computeEngagementHealth(["ready"], OLD, NOW)).toBe("healthy");
  });
});
