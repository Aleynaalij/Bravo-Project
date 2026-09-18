import { Resend } from "resend";

// No-ops safely when RESEND_API_KEY is unset — same "configure it later,
// nothing breaks meanwhile" contract as src/sentry.server.config.ts's
// NEXT_PUBLIC_SENTRY_DSN. A sandbox or fresh deploy with no Resend account
// yet still runs every code path that calls sendEmail; it just logs
// instead of actually sending, so this is unambiguous at a glance rather
// than silently swallowed.
export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (input.to.length === 0) return { sent: false };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(
      `[email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured — skipping send of "${input.subject}" to ${input.to.length} recipient(s).`,
    );
    return { sent: false };
  }

  const client = new Resend(apiKey);
  const { error } = await client.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) {
    console.error(`[email] Resend send failed for "${input.subject}":`, error);
    return { sent: false };
  }
  return { sent: true };
}
