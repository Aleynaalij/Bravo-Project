"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches a crash in the root layout itself (error.tsx doesn't — it's
// rendered inside that layout, so it can't recover from the layout
// throwing). Next.js requires this to render its own <html>/<body>,
// replacing the root layout entirely, so it deliberately avoids every
// app import (Tailwind classes, components, fonts) that could itself be
// part of what broke — plain inline styles only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f7f8fa",
          color: "#1a1a2e",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "24rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e2e4ea",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b42318", margin: "0 0 0.5rem" }}>
            SOMETHING WENT WRONG
          </p>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            BravoPilot hit an unexpected error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#5b6785", margin: "0 0 1rem" }}>
            It&apos;s been reported and we&apos;re looking into it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#2f5fe0",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
