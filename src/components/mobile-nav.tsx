"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveHref, type NavItem } from "./nav-links";
import { Button } from "./ui/button";

// The header's own nav row is hidden below md (see header.tsx); this is
// what replaces it — a slide-out drawer with full-width rows instead of a
// cramped wrapped link row, per the style-direction review.
export function MobileNav({
  items,
  userEmail,
  signOutAction,
}: {
  items: NavItem[];
  userEmail: string;
  signOutAction: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, items);

  // Close on navigation — adjusting state during render (React's
  // documented pattern, already used the same way in deliverable-view.tsx)
  // rather than an effect, since this reacts to a prop change instead of
  // synchronizing with an external system.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="relative flex h-full w-[85vw] max-w-xs flex-col bg-surface shadow-xl"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">
                Bravo<span className="text-brand">Pilot</span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto py-1">
              {items.map((item) => {
                const isActive = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between border-b border-border px-4 py-3.5 text-[15px] font-semibold ${
                      isActive ? "text-brand" : "text-foreground"
                    }`}
                  >
                    {item.label}
                    <span className={isActive ? "text-brand" : "text-muted"}>&rsaquo;</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="truncate text-xs text-muted">{userEmail}</span>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
