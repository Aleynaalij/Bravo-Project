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

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const bestLength = Math.max(...items.map((item) => matchLength(pathname, item.href)));

  return (
    <>
      {items.map((item) => {
        const isActive = bestLength >= 0 && matchLength(pathname, item.href) === bestLength;
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
