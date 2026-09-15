"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: ReactNode;
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

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, items);

  return (
    <>
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "border-b-2 border-brand pb-0.5 font-medium text-foreground"
                : "border-b-2 border-transparent pb-0.5 text-muted hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
