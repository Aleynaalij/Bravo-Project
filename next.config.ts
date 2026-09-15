import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Source-map upload (org/project + SENTRY_AUTH_TOKEN) is intentionally
// left unconfigured — it's a separate credential from NEXT_PUBLIC_SENTRY_DSN
// and this build has neither. The plugin skips upload gracefully without
// them; `silent` just keeps that expected skip out of build logs. (Not
// setting `disableLogger`: it's webpack-only and this project builds with
// Turbopack, where it just prints a deprecation warning and does nothing.)
export default withSentryConfig(nextConfig, {
  silent: true,
});
