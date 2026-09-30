import { describe, expect, it } from "vitest";
import { inventorySchema } from "./discovery";

const valid = {
  schemaVersion: 1, cloud: "gcc_high", tenantLabel: "Example tenant",
  capturedAt: "2026-09-30T12:00:00Z",
  counts: { sensitivityLabels: 3, dlpPolicies: 2, retentionPolicies: 1, ediscoveryCases: 0 },
};

describe("sanitized read-only inventory", () => {
  it("accepts a bounded aggregate snapshot", () => {
    expect(inventorySchema.safeParse(valid).success).toBe(true);
  });
  it("rejects raw policy or tenant details, including nested fields", () => {
    expect(inventorySchema.safeParse({ ...valid, tenantId: "secret" }).success).toBe(false);
    expect(inventorySchema.safeParse({ ...valid, counts: { ...valid.counts, policyNames: ["Internal"] } }).success).toBe(false);
  });
  it("rejects negative or fractional counts", () => {
    expect(inventorySchema.safeParse({ ...valid, counts: { ...valid.counts, dlpPolicies: -1 } }).success).toBe(false);
    expect(inventorySchema.safeParse({ ...valid, counts: { ...valid.counts, dlpPolicies: 0.5 } }).success).toBe(false);
  });
});
