import { describe, expect, it } from "vitest";
import { troubleshootResultSchema } from "./troubleshoot";

function baseResult(overrides: Record<string, unknown> = {}) {
  return {
    potentialCauses: [{ title: "Misconfigured policy", explanation: "The DLP policy scope excludes this site.", likelihood: "medium" }],
    troubleshootingFlow: ["Check policy scope", "Re-run compliance scan"],
    requiredValidation: [],
    suggestedCommands: [],
    escalationPath: "Escalate to the tenant admin if unresolved after validation.",
    architectureConcerns: [],
    confidenceScore: 60,
    ...overrides,
  };
}

describe("troubleshootResultSchema", () => {
  it("accepts a low-confidence result with no high-likelihood cause", () => {
    expect(troubleshootResultSchema.safeParse(baseResult()).success).toBe(true);
  });

  it("accepts a high-confidence result that has a high-likelihood cause", () => {
    const result = baseResult({
      confidenceScore: 90,
      potentialCauses: [{ title: "X", explanation: "Y", likelihood: "high" }],
    });
    expect(troubleshootResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a high-confidence result with no high-likelihood cause — internally inconsistent", () => {
    const result = baseResult({ confidenceScore: 85, potentialCauses: [{ title: "X", explanation: "Y", likelihood: "medium" }] });
    const parsed = troubleshootResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
  });
});
