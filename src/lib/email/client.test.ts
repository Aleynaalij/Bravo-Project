import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./client";

describe("sendEmail", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
    vi.restoreAllMocks();
  });

  it("no-ops and warns when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = "notifications@example.com";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendEmail({ to: ["a@example.com"], subject: "Test", html: "<p>hi</p>" });

    expect(result).toEqual({ sent: false });
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("no-ops when RESEND_FROM_EMAIL is unset even if an API key is present", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.RESEND_FROM_EMAIL;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendEmail({ to: ["a@example.com"], subject: "Test", html: "<p>hi</p>" });

    expect(result).toEqual({ sent: false });
  });

  it("no-ops without warning when there are no recipients", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "notifications@example.com";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendEmail({ to: [], subject: "Test", html: "<p>hi</p>" });

    expect(result).toEqual({ sent: false });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
