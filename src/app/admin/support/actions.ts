"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { resolveSupportRequest } from "@/lib/support/service";

// Uses the session client, not the admin client — the
// support_requests_update_admin RLS policy already permits this write for
// any is_platform_admin() caller, same pattern as admin/knowledge-base's
// write actions.
export async function resolveSupportRequestAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await requirePlatformAdmin(supabase);
  await resolveSupportRequest(supabase, id);

  revalidatePath("/admin/support");
}
