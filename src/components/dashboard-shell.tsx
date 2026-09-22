import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { buildNavEntries } from "@/lib/nav-config";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

// Renders around every authenticated page (see dashboard/layout.tsx and
// admin/layout.tsx) — one auth + nav-tree fetch shared by the whole
// section instead of each page repeating it. Replaces the old top-bar
// Header: a persistent left rail on desktop is the primary-nav pattern
// this redesign is chasing (Claude, ChatGPT) rather than a link row that
// has to keep compressing itself as tabs get added.
export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <>{children}</>;

  const { data: userRow } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  const entries = buildNavEntries(userRow?.is_platform_admin ?? false);
  const email = user.email ?? "";

  return (
    <div className="flex min-h-screen">
      <Sidebar entries={entries} email={email} signOutAction={signOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <Logo />
          <MobileNav entries={entries} userEmail={email} signOutAction={signOut} />
        </div>

        {children}
      </div>
    </div>
  );
}
