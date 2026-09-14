import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Logo } from "./logo";
import { Button } from "./ui/button";

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

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-foreground">
            Projects
          </Link>
          <Link href="/dashboard/billing" className="text-muted hover:text-foreground">
            Billing
          </Link>
          {userRow?.is_platform_admin && (
            <Link href="/admin/knowledge-base" className="text-muted hover:text-foreground">
              Knowledge Base
            </Link>
          )}
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
