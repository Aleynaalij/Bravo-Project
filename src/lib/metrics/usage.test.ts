import { describe, expect, it } from "vitest";
import { groupServicesByPracticeArea } from "./usage";

describe("groupServicesByPracticeArea", () => {
  it("sums services within the same practice area", () => {
    const result = groupServicesByPracticeArea([
      { serviceType: "dlp", count: 5 },
      { serviceType: "retention", count: 3 },
      { serviceType: "cloud_migration", count: 4 },
    ]);

    expect(result).toEqual([
      { practiceArea: "data_security_compliance", label: "Data Security & Compliance", count: 8 },
      { practiceArea: "cloud_migration", label: "Cloud Migration", count: 4 },
    ]);
  });

  it("sorts by count descending", () => {
    const result = groupServicesByPracticeArea([
      { serviceType: "sharepoint", count: 1 },
      { serviceType: "dlp", count: 10 },
    ]);

    expect(result.map((r) => r.practiceArea)).toEqual(["data_security_compliance", "sharepoint"]);
  });

  it("returns an empty array for no services", () => {
    expect(groupServicesByPracticeArea([])).toEqual([]);
  });
});
