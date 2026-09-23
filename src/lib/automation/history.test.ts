import { describe, expect, it } from "vitest";
import { getAutomationRequestStatus, historyItemTitle, parseCodeCreatorInput } from "./history";

describe("getAutomationRequestStatus", () => {
  const now = new Date("2026-09-23T16:00:00Z");

  it("is succeeded when output is present", () => {
    expect(
      getAutomationRequestStatus(
        { output: { content: "x", notes: "", rollback: "" }, error_message: null, created_at: now.toISOString() },
        now,
      ),
    ).toBe("succeeded");
  });

  it("is failed when error_message is present, even if old", () => {
    expect(
      getAutomationRequestStatus(
        { output: null, error_message: "boom", created_at: "2026-09-23T15:00:00Z" },
        now,
      ),
    ).toBe("failed");
  });

  it("is processing when both are null and the request is recent", () => {
    expect(
      getAutomationRequestStatus({ output: null, error_message: null, created_at: "2026-09-23T15:59:30Z" }, now),
    ).toBe("processing");
  });

  it("is timed_out when both are null and the request is older than the grace window", () => {
    expect(
      getAutomationRequestStatus({ output: null, error_message: null, created_at: "2026-09-23T15:55:00Z" }, now),
    ).toBe("timed_out");
  });

  it("prefers output over error_message if somehow both are set", () => {
    expect(
      getAutomationRequestStatus(
        {
          output: { content: "x", notes: "", rollback: "" },
          error_message: "stale error",
          created_at: now.toISOString(),
        },
        now,
      ),
    ).toBe("succeeded");
  });
});

describe("historyItemTitle", () => {
  it("returns a short description unchanged", () => {
    expect(historyItemTitle("renew certs on a schedule")).toBe("renew certs on a schedule");
  });

  it("truncates a long description with an ellipsis", () => {
    const long = "a".repeat(100);
    const title = historyItemTitle(long);
    expect(title.length).toBe(70);
    expect(title.endsWith("…")).toBe(true);
  });

  it("trims surrounding whitespace before measuring length", () => {
    expect(historyItemTitle("  short  ")).toBe("short");
  });
});

describe("parseCodeCreatorInput", () => {
  it("parses well-formed stored input", () => {
    const stored = JSON.stringify({
      description: "renew certs",
      scriptType: "powershell",
      environmentProfile: "commercial",
      operatingSystem: "windows",
      authMethod: "certificate",
      languageVersion: null,
      outputLocation: null,
      additionalContext: null,
    });
    const parsed = parseCodeCreatorInput(stored);
    expect(parsed?.description).toBe("renew certs");
    expect(parsed?.scriptType).toBe("powershell");
  });

  it("returns null for invalid JSON", () => {
    expect(parseCodeCreatorInput("not json")).toBeNull();
  });

  it("returns null when the parsed object has no description", () => {
    expect(parseCodeCreatorInput(JSON.stringify({ scriptType: "powershell" }))).toBeNull();
  });
});
