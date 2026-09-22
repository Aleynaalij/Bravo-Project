"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { flattenNavEntries, getActiveHref, isNavGroup, type NavEntry } from "@/lib/nav-config";

function NavRow({ item, isActive }: { item: { href: string; label: string }; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
        isActive ? "bg-brand-light font-medium text-brand" : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {item.label}
    </Link>
  );
}

// Persistent left rail on desktop — the primary nav pattern of the
// products this redesign is chasing (Claude, ChatGPT): one calm, always-
// visible list instead of a top bar that has to keep compressing itself
// as tabs get added. Hidden below md; MobileNav's drawer covers that case
// with the same nav tree.
export function Sidebar({
  entries,
  email,
  signOutAction,
}: {
  entries: NavEntry[];
  email: string;
  signOutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, flattenNavEntries(entries));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="px-4 py-4">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
        {entries.map((entry) =>
          isNavGroup(entry) ? (
            <div key={entry.label} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">{entry.label}</div>
              {entry.items.map((item) => (
                <NavRow key={item.href} item={item} isActive={item.href === activeHref} />
              ))}
            </div>
          ) : (
            <NavRow key={entry.href} item={entry} isActive={entry.href === activeHref} />
          ),
        )}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
        <span className="truncate text-xs text-muted">{email}</span>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
