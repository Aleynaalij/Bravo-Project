import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // CSP is set per-request in proxy.ts (it needs a fresh nonce each time);
  // everything else static enough to not need that lives here.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
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
