import * as Sentry from "@sentry/nextjs";

// Client-side counterpart to sentry.server.config.ts/sentry.edge.config.ts
// — see those for the no-op-until-configured rationale.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
