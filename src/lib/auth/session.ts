import type { SupabaseClient } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
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
// Returns the caller's identity (not just void) so callers that need to
// write an audit_log row — every KB admin mutation does — don't have to
// make a second auth.getUser() call just to get the actor's email.
export async function requirePlatformAdmin(
  supabase: SupabaseClient,
): Promise<{ userId: string; email: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new UnauthorizedError();

  const { data, error } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new UnauthorizedError();
  if (!data.is_platform_admin) throw new ForbiddenError("Not a platform admin");

  return { userId: user.id, email: user.email };
}

// Throws UnauthorizedError if not signed in, ForbiddenError if signed in
// but not the account's owner. Billing management, team management, and
// account deletion are owner-only now that an account can have more than
// one user (docs/PRD.md §11) — everything else (projects, deliverables,
// generation, export, branding) stays available to any user on the
// account, matching a typical shared-workspace model.
export async function requireAccountOwner(
  supabase: SupabaseClient,
): Promise<{ accountId: string; userId: string; email: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new UnauthorizedError();

  const { data, error } = await supabase
    .from("users")
    .select("account_id, role")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new UnauthorizedError();
  if (data.role !== "owner") throw new ForbiddenError("Only the account owner can do this");

  return { accountId: data.account_id as string, userId: user.id, email: user.email };
}
