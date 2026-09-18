import { describe, expect, it } from "vitest";
import { generationFailedEmail } from "./templates";

describe("generationFailedEmail", () => {
  it("includes the deliverable label, project name, and error message", () => {
    const { subject, html } = generationFailedEmail({
      projectName: "Contoso Purview Rollout",
      deliverableType: "high_level_design",
      errorMessage: "AI response was not valid JSON",
      projectUrl: "https://app.example.com/dashboard/abc-123",
    });

    expect(subject).toContain("Contoso Purview Rollout");
    expect(html).toContain("Contoso Purview Rollout");
    expect(html).toContain("AI response was not valid JSON");
    expect(html).toContain("https://app.example.com/dashboard/abc-123");
  });

  it("escapes HTML-significant characters in interpolated values", () => {
    const { html } = generationFailedEmail({
      projectName: "<script>alert(1)</script>",
      deliverableType: "high_level_design",
      errorMessage: "some & <stuff>",
      projectUrl: "https://app.example.com/dashboard/abc-123",
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("some &amp; &lt;stuff&gt;");
  });
});
