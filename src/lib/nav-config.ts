export interface NavItem {
  href: string;
  label: string;
}

// A top-level entry is either a direct link or a group of related links
// under one section label — how the sidebar organizes tabs as more get
// added, instead of every new feature widening a flat link list forever.
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function flattenNavEntries(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => (isNavGroup(entry) ? entry.items : [entry]));
}

// The whole account/admin nav tree, pure so it's testable without a
// Supabase round trip — the sidebar and mobile drawer both render this
// same structure. Admin-only entries append at the end rather than
// interleaving, keeping the account-facing groups in a stable order
// whether or not the viewer is a platform admin.
export function buildNavEntries(isPlatformAdmin: boolean): NavEntry[] {
  const entries: NavEntry[] = [
    { href: "/dashboard", label: "Projects" },
    { href: "/dashboard/metrics", label: "Dashboards" },
    {
      label: "Knowledge",
      items: [
        { href: "/dashboard/vault", label: "FileVault" },
        { href: "/dashboard/knowledge-vault", label: "Knowledge Vault" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/dashboard/billing", label: "Billing" },
        { href: "/dashboard/support", label: "Support" },
        { href: "/dashboard/settings", label: "Settings" },
      ],
    },
  ];

  if (isPlatformAdmin) {
    entries.push({
      label: "Admin",
      items: [
        { href: "/admin/knowledge-base", label: "Knowledge Base" },
        { href: "/admin/metrics", label: "Platform Metrics" },
        { href: "/admin/support", label: "Support Requests" },
      ],
    });
  }

  return entries;
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

// Shared by Sidebar (desktop rail) and MobileNav (drawer) so both agree on
// which item is "active" without duplicating the matching logic.
export function getActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: { href: string; length: number } | null = null;
  for (const item of items) {
    const length = matchLength(pathname, item.href);
    if (length > (best?.length ?? -1)) best = { href: item.href, length };
  }
  return best ? best.href : null;
}
