"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

// A top-level entry is either a direct link or a dropdown grouping a few
// related links under one label — how the nav stays short as more tabs get
// added, instead of every new feature growing the flat link row forever.
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function flattenNavEntries(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]));
}

// A link is a prefix match if the current path is that route or a route
// nested under it (e.g. "/dashboard/[projectId]" under "/dashboard"). Picks
// the single longest matching href so a more specific sibling route (e.g.
// "/dashboard/billing") wins over a shorter parent ("/dashboard") instead
// of both lighting up.
function matchLength(pathname: string, href: string): number {
  if (pathname === href) return href.length;
  if (pathname.startsWith(`${href}/`)) return href.length;
  return -1;
}

// Shared by NavLinks (desktop inline nav) and MobileNav (drawer) so both
// agree on which item is "active" without duplicating the matching logic.
export function getActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: { href: string; length: number } | null = null;
  for (const item of items) {
    const length = matchLength(pathname, item.href);
    if (length > (best?.length ?? -1)) best = { href: item.href, length };
  }
  return best ? best.href : null;
}

function linkClasses(isActive: boolean): string {
  return isActive
    ? "border-b-2 border-brand pb-0.5 font-medium text-foreground"
    : "border-b-2 border-transparent pb-0.5 text-muted hover:text-foreground";
}

function NavDropdown({ group, activeHref }: { group: NavGroup; activeHref: string | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActiveGroup = group.items.some((item) => item.href === activeHref);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 ${linkClasses(isActiveGroup)}`}
      >
        {group.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 min-w-40 rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={item.href === activeHref ? "page" : undefined}
              className={`block px-3 py-2 text-sm ${
                item.href === activeHref ? "font-medium text-brand" : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavLinks({ entries }: { entries: NavEntry[] }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, flattenNavEntries(entries));

  return (
    <>
      {entries.map((entry) =>
        isGroup(entry) ? (
          <NavDropdown key={entry.label} group={entry} activeHref={activeHref} />
        ) : (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={entry.href === activeHref ? "page" : undefined}
            className={linkClasses(entry.href === activeHref)}
          >
            {entry.label}
          </Link>
        ),
      )}
    </>
  );
}
