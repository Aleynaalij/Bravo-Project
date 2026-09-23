import { describe, expect, it } from "vitest";
import { canSubmitForReview, canDecideReview, canExportForClient } from "./review";

describe("canSubmitForReview", () => {
  it("allows submitting a ready, not-yet-submitted deliverable", () => {
    expect(canSubmitForReview("ready", "not_submitted")).toBe(true);
  });

  it("allows resubmitting after changes were requested", () => {
    expect(canSubmitForReview("ready", "changes_requested")).toBe(true);
  });

  it("blocks submitting a deliverable that isn't ready", () => {
    expect(canSubmitForReview("pending", "not_submitted")).toBe(false);
    expect(canSubmitForReview("generating", "not_submitted")).toBe(false);
    expect(canSubmitForReview("failed", "not_submitted")).toBe(false);
  });

  it("blocks submitting one already in review or already approved", () => {
    expect(canSubmitForReview("ready", "in_review")).toBe(false);
    expect(canSubmitForReview("ready", "approved")).toBe(false);
  });
});

describe("canDecideReview", () => {
  it("only allows approving or requesting changes while in review", () => {
    expect(canDecideReview("in_review")).toBe(true);
    expect(canDecideReview("not_submitted")).toBe(false);
    expect(canDecideReview("approved")).toBe(false);
    expect(canDecideReview("changes_requested")).toBe(false);
  });
});

describe("canExportForClient", () => {
  it("only clears an approved deliverable for client-facing export", () => {
    expect(canExportForClient("approved")).toBe(true);
    expect(canExportForClient("not_submitted")).toBe(false);
    expect(canExportForClient("in_review")).toBe(false);
    expect(canExportForClient("changes_requested")).toBe(false);
  });
});
