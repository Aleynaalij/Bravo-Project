import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import type { DeliverableType } from "@/lib/domain/enums";

// Plain, inline-styled HTML — no email-templating framework. One template
// today; if a second one shows up, factor a shared layout then rather
// than build one now for a single caller.
function wrapLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 18px; margin: 0 0 16px;">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </body>
</html>`;
}

export interface GenerationFailedEmailInput {
  projectName: string;
  deliverableType: DeliverableType;
  errorMessage: string;
  projectUrl: string;
}

export function generationFailedEmail(input: GenerationFailedEmailInput): {
  subject: string;
  html: string;
} {
  const label = DELIVERABLE_LABELS[input.deliverableType] ?? input.deliverableType;
  const subject = `Generation failed: ${label} for ${input.projectName}`;
  const html = wrapLayout(
    subject,
    `<p style="font-size: 14px; line-height: 1.5;">The AI draft for <strong>${escapeHtml(label)}</strong> on
      <strong>${escapeHtml(input.projectName)}</strong> didn't complete.</p>
    <p style="font-size: 13px; line-height: 1.5; color: #555; background: #f5f5f5; padding: 12px; border-radius: 6px;">
      ${escapeHtml(input.errorMessage)}
    </p>
    <p style="font-size: 14px; line-height: 1.5;">
      <a href="${escapeHtml(input.projectUrl)}" style="color: #2563eb;">Open the project</a> to review and try again.
    </p>`,
  );
  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
