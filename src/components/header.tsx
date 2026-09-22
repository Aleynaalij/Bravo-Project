import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { NavLinks, type NavEntry } from "./nav-links";
import { MobileNav } from "./mobile-nav";

// Renders on every authenticated page. Re-queries is_platform_admin itself
// rather than taking it as a prop — keeps every call site to a one-line
// <Header /> instead of each page having to fetch and thread it through.
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  // Grouped into a couple of dropdowns instead of one flat, ever-growing
  // link row — "Projects"/"Dashboards" stay direct links since they're the
  // most-used pages, everything else nests under a labeled group so adding
  // a future tab doesn't widen the row again.
  const navEntries: NavEntry[] = [
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
    ...(userRow?.is_platform_admin
      ? [
          {
            label: "Admin",
            items: [
              { href: "/admin/knowledge-base", label: "Knowledge Base" },
              { href: "/admin/metrics", label: "Platform Metrics" },
              { href: "/admin/support", label: "Support Requests" },
            ],
          },
        ]
      : []),
  ];

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-x-4 text-sm md:flex">
          <NavLinks entries={navEntries} />
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
        <MobileNav entries={navEntries} userEmail={user.email ?? ""} signOutAction={signOut} />
      </div>
    </header>
  );
}
