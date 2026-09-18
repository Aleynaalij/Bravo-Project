import { describe, expect, it } from "vitest";
import {
  computeDeliveryRisk,
  computeDeliveryRiskScore,
  summarizeDeliveryRisk,
} from "./delivery-risk";

describe("computeDeliveryRiskScore", () => {
  it("scores 0 for a small, single-region, narrow-scope project", () => {
    expect(
      computeDeliveryRiskScore({ userCount: 50, geographicLocations: ["US"], services: ["dlp"] }),
    ).toBe(0);
  });

  it("adds a point for a large user count", () => {
    expect(
      computeDeliveryRiskScore({ userCount: 1000, geographicLocations: ["US"], services: [] }),
    ).toBe(1);
  });

  it("adds a second point for a very large user count", () => {
    expect(
      computeDeliveryRiskScore({ userCount: 5000, geographicLocations: ["US"], services: [] }),
    ).toBe(2);
  });

  it("adds a point for multi-region scope", () => {
    expect(
      computeDeliveryRiskScore({ userCount: 50, geographicLocations: ["US", "EU"], services: [] }),
    ).toBe(1);
  });

  it("adds a point for a wide compliance-service footprint", () => {
    expect(
      computeDeliveryRiskScore({
        userCount: 50,
        geographicLocations: ["US"],
        services: ["dlp", "retention", "sensitivity_labels", "insider_risk_management"],
      }),
    ).toBe(1);
  });

  it("does not count non-compliance services toward the compliance-scope point", () => {
    expect(
      computeDeliveryRiskScore({
        userCount: 50,
        geographicLocations: ["US"],
        services: ["cloud_migration", "app_modernization", "sharepoint", "analytics_ai"],
      }),
    ).toBe(0);
  });

  it("stacks independent risk factors", () => {
    expect(
      computeDeliveryRiskScore({
        userCount: 5000,
        geographicLocations: ["US", "EU", "APAC"],
        services: ["dlp", "retention", "sensitivity_labels", "insider_risk_management"],
      }),
    ).toBe(4);
  });
});

describe("computeDeliveryRisk", () => {
  it("is low at score 0", () => {
    expect(computeDeliveryRisk({ userCount: 50, geographicLocations: ["US"], services: [] })).toBe(
      "low",
    );
  });

  it("is elevated at score 1", () => {
    expect(
      computeDeliveryRisk({ userCount: 1000, geographicLocations: ["US"], services: [] }),
    ).toBe("elevated");
  });

  it("is elevated at score 2", () => {
    expect(
      computeDeliveryRisk({ userCount: 5000, geographicLocations: ["US"], services: [] }),
    ).toBe("elevated");
  });

  it("is high at score 3 or more", () => {
    expect(
      computeDeliveryRisk({
        userCount: 5000,
        geographicLocations: ["US", "EU"],
        services: [],
      }),
    ).toBe("high");
  });
});

describe("summarizeDeliveryRisk", () => {
  it("groups projects by risk and counts each bucket", () => {
    const summary = summarizeDeliveryRisk([
      { id: "a", userCount: 50, geographicLocations: ["US"], services: [] },
      { id: "b", userCount: 1000, geographicLocations: ["US"], services: [] },
      {
        id: "c",
        userCount: 5000,
        geographicLocations: ["US", "EU"],
        services: [],
      },
    ]);

    expect(summary.byProject).toEqual({ a: "low", b: "elevated", c: "high" });
    expect(summary.counts).toEqual({ low: 1, elevated: 1, high: 1 });
  });

  it("returns zeroed counts for no projects", () => {
    expect(summarizeDeliveryRisk([]).counts).toEqual({ low: 0, elevated: 0, high: 0 });
  });
});
