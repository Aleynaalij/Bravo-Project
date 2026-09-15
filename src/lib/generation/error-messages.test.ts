import { describe, expect, it } from "vitest";
import { getFriendlyGenerationError } from "./error-messages";

describe("getFriendlyGenerationError", () => {
  it("maps a missing-template error to a friendly message", () => {
    expect(getFriendlyGenerationError("No active prompt template for cloud_migration_plan")).toBe(
      "This deliverable type isn't available yet — it hasn't been fully set up on the platform. Try a different type, or contact support.",
    );
  });

  it("maps the missing-services error", () => {
    expect(getFriendlyGenerationError("Select at least one service in scope before generating")).toBe(
      "Add at least one service to this project's scope, then try generating again.",
    );
  });

  it("maps a deleted-project error", () => {
    expect(getFriendlyGenerationError("Project not found")).toBe(
      "This project couldn't be found — it may have been deleted.",
    );
  });

  it("maps every AI-output-validation failure to the same 'try again' message", () => {
    const friendly =
      "The AI draft came back in an unexpected format. This is usually temporary — try generating again.";
    expect(getFriendlyGenerationError("AI response was not valid JSON")).toBe(friendly);
    expect(
      getFriendlyGenerationError(
        "AI response did not match the expected section schema: some zod error",
      ),
    ).toBe(friendly);
    expect(
      getFriendlyGenerationError(
        "AI response used different sections than requested — expected [A], got [B]",
      ),
    ).toBe(friendly);
  });

  it("falls back to a generic message for an unrecognized error — e.g. a raw Postgres or provider SDK exception", () => {
    expect(getFriendlyGenerationError("connection terminated unexpectedly")).toBe(
      "Generation didn't complete successfully. Try again — if it keeps happening, contact support.",
    );
  });

  it("falls back to the generic message when there's no error text at all", () => {
    expect(getFriendlyGenerationError(null)).toBe(
      "Generation didn't complete successfully. Try again — if it keeps happening, contact support.",
    );
  });
});
