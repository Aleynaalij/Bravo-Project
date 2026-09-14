import type { SupabaseClient } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

// Resolves the signed-in user's account_id. Used wherever we need to set
// account_id explicitly (e.g. on insert) rather than relying solely on RLS.
export async function requireAccountId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError();

  const { data, error } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new UnauthorizedError();

  return data.account_id as string;
}
