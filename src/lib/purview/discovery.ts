import { z } from "zod";

// Only aggregate counts are accepted. Strict objects reject policy names,
// tenant IDs, user details and other data from a raw tenant export.
export const inventorySchema = z.strictObject({
  schemaVersion: z.literal(1),
  cloud: z.enum(["commercial", "gcc", "gcc_high", "dod", "other"]),
  tenantLabel: z.string().trim().min(1).max(120),
  capturedAt: z.iso.datetime({ offset: true }),
  counts: z.strictObject({
    sensitivityLabels: z.number().int().min(0).max(100000),
    dlpPolicies: z.number().int().min(0).max(100000),
    retentionPolicies: z.number().int().min(0).max(100000),
    ediscoveryCases: z.number().int().min(0).max(100000),
  }),
});
