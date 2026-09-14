import type { SupabaseClient } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Not a platform admin");
    this.name = "ForbiddenError";
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

// Throws UnauthorizedError if not signed in, ForbiddenError if signed in
// but not a platform admin. Callers only need to catch and map both.
export async function requirePlatformAdmin(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const { data, error } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new UnauthorizedError();
  if (!data.is_platform_admin) throw new ForbiddenError();
}
