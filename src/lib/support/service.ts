import type { SupabaseClient } from "@supabase/supabase-js";

export type SupportRequestStatus = "open" | "resolved";

export interface SupportRequestRow {
  id: string;
  account_id: string;
  submitter_user_id: string | null;
  submitter_email: string;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  created_at: string;
  resolved_at: string | null;
}

export async function createSupportRequest(
  supabase: SupabaseClient,
  accountId: string,
  submitterUserId: string,
  submitterEmail: string,
  subject: string,
  message: string,
): Promise<SupportRequestRow> {
  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      account_id: accountId,
      submitter_user_id: submitterUserId,
      submitter_email: submitterEmail,
      subject,
      message,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Scoped by RLS to the caller's own submitted requests (support_requests_select) —
// no account_id filter needed here, same "the client passed in decides the
// scope" convention as src/lib/metrics/usage.ts.
export async function listMySupportRequests(supabase: SupabaseClient): Promise<SupportRequestRow[]> {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Admin-only in practice (RLS only lets is_platform_admin() see rows
// beyond their own) — called with the admin client from the admin support
// queue page, same pattern as every other admin listing in this app.
export async function listAllSupportRequests(admin: SupabaseClient): Promise<SupportRequestRow[]> {
  const { data, error } = await admin
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveSupportRequest(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin
    .from("support_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
