import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";

// Gates every /admin/* route in one place. Returns 404 rather than a
// visible 403 for non-admins — not worth signaling that admin routes
// exist to a regular signed-in user. Shares the same sidebar shell as
// /dashboard (DashboardShell adds the Admin nav group itself once it
// re-queries is_platform_admin), so an admin gets one consistent nav
// tree rather than a different chrome once they cross into /admin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  try {
    await requirePlatformAdmin(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
