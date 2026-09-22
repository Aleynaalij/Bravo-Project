import { describe, expect, it } from "vitest";
import { codeAuditResultSchema } from "./automation";

const baseFindings = { security: [], performance: [], maintainability: [], reliability: [], bestPractices: [] };
const baseScoreCard = { security: 80, performance: 80, maintainability: 80, documentation: 80, overall: 80 };

describe("codeAuditResultSchema", () => {
  it("accepts a well-formed result with no findings", () => {
    const result = codeAuditResultSchema.safeParse({ ...baseFindings, scoreCard: baseScoreCard });
    expect(result.success).toBe(true);
  });

  it("accepts a high security score when there are no critical/high security findings", () => {
    const result = codeAuditResultSchema.safeParse({
      ...baseFindings,
      security: [{ severity: "low", title: "Minor issue", detail: "..." }],
      scoreCard: { ...baseScoreCard, security: 95 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a security score >= 90 alongside a critical security finding", () => {
    const result = codeAuditResultSchema.safeParse({
      ...baseFindings,
      security: [{ severity: "critical", title: "Hardcoded credential", detail: "..." }],
      scoreCard: { ...baseScoreCard, security: 95 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a security score >= 90 alongside a high security finding", () => {
    const result = codeAuditResultSchema.safeParse({
      ...baseFindings,
      security: [{ severity: "high", title: "Weak auth", detail: "..." }],
      scoreCard: { ...baseScoreCard, security: 90 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a critical finding paired with a low security score", () => {
    const result = codeAuditResultSchema.safeParse({
      ...baseFindings,
      security: [{ severity: "critical", title: "Hardcoded credential", detail: "..." }],
      scoreCard: { ...baseScoreCard, security: 20 },
    });
    expect(result.success).toBe(true);
  });
});
