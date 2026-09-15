"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Next.js error boundary for everything under the root layout — a thrown
// error anywhere in a page/component tree renders this instead of a raw
// stack trace. Doesn't cover a crash in the root layout itself; see
// global-error.tsx for that.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Automatic instrumentation doesn't reliably catch React error-boundary
    // errors — Sentry's own Next.js guidance is to report them explicitly
    // here. No-ops safely when NEXT_PUBLIC_SENTRY_DSN is unset, same as
    // every other Sentry call site in this codebase.
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/dashboard" />
      </div>

      <Card className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-error-text">
          Something went wrong
        </span>
        <h1 className="text-xl font-semibold">This page hit an unexpected error</h1>
        <p className="text-sm text-muted">
          It&apos;s been reported and we&apos;re looking into it. Your data is safe — try again,
          or head back to your projects.
        </p>
        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/dashboard">
            <Button type="button">Back to your projects</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
