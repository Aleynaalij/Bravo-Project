import { describe, expect, it } from "vitest";
import { summarizeVaultMetrics } from "./vault";

describe("summarizeVaultMetrics", () => {
  it("returns all-zero counts for an empty vault", () => {
    const result = summarizeVaultMetrics([], 0);
    expect(result).toEqual({
      totalEntries: 0,
      totalScripts: 0,
      counts: { lessonLearned: 0, incident: 0 },
      entriesByService: [],
    });
  });

  it("splits entries into lesson-learned vs incident counts", () => {
    const result = summarizeVaultMetrics(
      [
        { entry_type: "lesson_learned", service_type: null },
        { entry_type: "lesson_learned", service_type: null },
        { entry_type: "incident", service_type: null },
      ],
      0,
    );
    expect(result.totalEntries).toBe(3);
    expect(result.counts).toEqual({ lessonLearned: 2, incident: 1 });
  });

  it("groups entries by service type, most-used first, skipping unset services", () => {
    const result = summarizeVaultMetrics(
      [
        { entry_type: "incident", service_type: "dlp" },
        { entry_type: "lesson_learned", service_type: "dlp" },
        { entry_type: "lesson_learned", service_type: "ediscovery" },
        { entry_type: "incident", service_type: null },
      ],
      0,
    );
    expect(result.entriesByService).toEqual([
      { serviceType: "dlp", count: 2 },
      { serviceType: "ediscovery", count: 1 },
    ]);
  });

  it("passes the script count straight through", () => {
    const result = summarizeVaultMetrics([], 7);
    expect(result.totalScripts).toBe(7);
  });
});
