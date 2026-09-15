import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { Alert } from "./ui/alert";

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo href="/" />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="text-muted hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted hover:text-foreground">
              Privacy
            </Link>
            <Link href="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" className="mb-6">
          <strong>Draft — not reviewed by counsel.</strong> This document is a starting point, not a
          finished legal instrument. Every bracketed placeholder needs a real answer, and the whole
          thing needs a lawyer&apos;s review before it governs a real customer relationship.
        </Alert>

        <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
        <p className="mb-8 text-sm text-muted">Last updated: {lastUpdated}</p>

        <div className="flex flex-col gap-6 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-foreground/90 [&_li]:text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_strong]:font-semibold [&_a]:text-brand [&_a]:hover:underline">
          {children}
        </div>
      </main>
    </>
  );
}
