import Link from "next/link";
import type { ReactNode } from "react";

// The mx-auto max-w-* content wrapper stays page-owned (widths genuinely
// differ: max-w-3xl for list/overview pages, max-w-xl for single-record
// forms) — this only consolidates the title/description/back-link/actions
// block every dashboard and admin page used to hand-roll slightly
// differently. backHref is optional and deliberately omitted on any page
// whose "back to X" target is already a persistent Sidebar entry (see
// src/components/sidebar.tsx) — that link is one click away at all times
// now, so repeating it in every page's own chrome was pure redundancy.
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {backHref && (
        <Link href={backHref} className="text-sm text-brand hover:underline">
          &larr; {backLabel ?? "Back"}
        </Link>
      )}
      <div className={`flex flex-wrap items-center justify-between gap-3 ${backHref ? "mt-4" : ""}`}>
        <div>
          <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
          {description && <p className="max-w-md text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </div>
  );
}
