import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";

// Gates every /admin/* route in one place. Returns 404 rather than a
// visible 403 for non-admins — not worth signaling that admin routes
// exist to a regular signed-in user.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  try {
    await requirePlatformAdmin(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }

  return <>{children}</>;
}
