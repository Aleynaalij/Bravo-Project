"use client";

import Link from "next/link";
import { ShieldTaskRegular } from "@fluentui/react-icons";

// Product-icon-style mark (colored badge + wordmark) — the same pattern
// Purview, Defender, Sentinel etc. use in the M365 admin centers, rather
// than a plain text wordmark. Gradient badge is the one place the brand
// gradient shows up outside a hero banner — a fixed small accent, not a
// second decorative use.
export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md text-white"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <ShieldTaskRegular className="h-4 w-4" />
      </span>
      Purview<span className="text-brand">Pilot</span>
    </Link>
  );
}
