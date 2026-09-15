import * as Sentry from "@sentry/nextjs";

// See sentry.server.config.ts — same no-op-until-configured behavior,
// covering the edge runtime (src/proxy.ts).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
});
