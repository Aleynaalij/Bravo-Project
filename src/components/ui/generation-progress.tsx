"use client";

import { useEffect, useState } from "react";

// No real progress signal exists for a single-shot AI completion (no
// streaming, just one request/response) — this eases toward 90% over
// the first ~15-60s so it visibly moves right away rather than sitting
// at 0%, then jumps straight to 100% the instant the real response
// lands (the caller unmounts this once isPending goes false). It's
// reassurance that the request is still alive, not a real percentage —
// the caption says so rather than implying false precision.
const EASE_SECONDS = 15;
const CEILING_PCT = 90;

export function GenerationProgress({ label = "Generating…" }: { label?: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsedSeconds = (Date.now() - start) / 1000;
      setPct(CEILING_PCT * (1 - Math.exp(-elapsedSeconds / EASE_SECONDS)));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted">{Math.round(pct)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        This can take up to a minute — the page updates automatically when it&apos;s done.
      </p>
    </div>
  );
}
