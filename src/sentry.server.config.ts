import * as Sentry from "@sentry/nextjs";

// No-ops safely when NEXT_PUBLIC_SENTRY_DSN is unset — same "configure
// when you have the real credentials" pattern already used for Stripe/
// OpenAI elsewhere in this codebase. `enabled` is set explicitly (on top
// of the SDK's own no-DSN no-op) so it's unambiguous at a glance that
// nothing is sent until a real DSN exists.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
});
