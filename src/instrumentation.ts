import * as Sentry from "@sentry/nextjs";

// Next.js's instrumentation hook — runs once per runtime on cold start.
// Loads the matching Sentry config file for whichever runtime this
// invocation actually is, since sentry.server.config.ts and
// sentry.edge.config.ts each import Node/edge-specific internals that
// can't both load in the same process.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown during Server Component rendering / Server
// Actions that Next.js's own error handling would otherwise only log to
// the console — the one place server-side application logging existed
// nowhere in this codebase before this file.
export const onRequestError = Sentry.captureRequestError;
