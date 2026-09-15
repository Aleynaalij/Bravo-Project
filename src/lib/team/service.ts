import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamRole = "owner" | "member";

export interface TeamMember {
  id: string;
  email: string;
  role: TeamRole;
  createdAt: string;
}

export async function listTeamMembers(
  supabase: SupabaseClient,
  accountId: string,
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as TeamRole,
    createdAt: row.created_at,
  }));
}

export async function countOwners(supabase: SupabaseClient, accountId: string): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("role", "owner");

  if (error) throw error;
  return count ?? 0;
}
