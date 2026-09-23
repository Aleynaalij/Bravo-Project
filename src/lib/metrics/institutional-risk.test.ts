import { describe, expect, it } from "vitest";
import { computeInstitutionalRisk, type InstitutionalRiskInput } from "./institutional-risk";

function rows(serviceType: InstitutionalRiskInput["serviceType"], authors: string[]): InstitutionalRiskInput[] {
  return authors.map((authorEmail) => ({ serviceType, authorEmail }));
}

describe("computeInstitutionalRisk", () => {
  it("leaves a service area unscored below the minimum item count", () => {
    const summary = computeInstitutionalRisk(rows("dlp", ["a@x.com", "a@x.com"]));
    expect(summary.byServiceArea).toEqual([]);
    expect(summary.unscored).toEqual([{ serviceType: "dlp", itemCount: 2 }]);
  });

  it("scores a service area at exactly the minimum item count", () => {
    const summary = computeInstitutionalRisk(rows("dlp", ["a@x.com", "a@x.com", "a@x.com"]));
    expect(summary.unscored).toEqual([]);
    expect(summary.byServiceArea).toEqual([
      { serviceType: "dlp", itemCount: 3, topAuthorEmail: "a@x.com", topAuthorShare: 1, risk: "high" },
    ]);
  });

  it("is low when no single author holds even half the content", () => {
    const summary = computeInstitutionalRisk(rows("dlp", ["a@x.com", "b@x.com", "c@x.com", "d@x.com"]));
    expect(summary.byServiceArea[0]).toMatchObject({ topAuthorShare: 0.25, risk: "low" });
  });

  it("is elevated at exactly a 50% single-author share", () => {
    const summary = computeInstitutionalRisk(rows("dlp", ["a@x.com", "a@x.com", "b@x.com", "b@x.com"]));
    expect(summary.byServiceArea[0]).toMatchObject({ topAuthorShare: 0.5, risk: "elevated" });
  });

  it("is high at exactly a 75% single-author share", () => {
    const summary = computeInstitutionalRisk(rows("dlp", ["a@x.com", "a@x.com", "a@x.com", "b@x.com"]));
    expect(summary.byServiceArea[0]).toMatchObject({ topAuthorShare: 0.75, risk: "high" });
  });

  it("scores each service area independently", () => {
    const summary = computeInstitutionalRisk([
      ...rows("dlp", ["a@x.com", "a@x.com", "a@x.com"]),
      ...rows("retention", ["a@x.com", "b@x.com", "c@x.com"]),
    ]);
    const byType = Object.fromEntries(summary.byServiceArea.map((s) => [s.serviceType, s.risk]));
    expect(byType).toEqual({ dlp: "high", retention: "low" });
  });

  it("sorts service areas by top-author share, highest risk first", () => {
    const summary = computeInstitutionalRisk([
      ...rows("dlp", ["a@x.com", "b@x.com", "c@x.com"]),
      ...rows("retention", ["a@x.com", "a@x.com", "a@x.com"]),
    ]);
    expect(summary.byServiceArea.map((s) => s.serviceType)).toEqual(["retention", "dlp"]);
  });

  it("ignores rows with no service type", () => {
    const summary = computeInstitutionalRisk([
      { serviceType: null, authorEmail: "a@x.com" },
      { serviceType: null, authorEmail: "a@x.com" },
      { serviceType: null, authorEmail: "a@x.com" },
    ]);
    expect(summary.byServiceArea).toEqual([]);
    expect(summary.unscored).toEqual([]);
  });

  it("returns empty results for no rows", () => {
    const summary = computeInstitutionalRisk([]);
    expect(summary.byServiceArea).toEqual([]);
    expect(summary.unscored).toEqual([]);
  });
});
