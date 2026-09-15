import type { SupabaseClient } from "@supabase/supabase-js";

// Keep this list in sync with every call to writeAuditLog — it's what
// makes the Settings audit-log view legible instead of a wall of raw
// strings, and having one place to look for the current worked set beats
// reverse-engineering it from call sites scattered across the codebase.
export type AuditAction =
  | "team.invite"
  | "team.remove"
  | "team.role_change"
  | "kb.create"
  | "kb.update"
  | "kb.delete";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "team.invite": "Invited teammate",
  "team.remove": "Removed teammate",
  "team.role_change": "Changed teammate role",
  "kb.create": "Created knowledge base entry",
  "kb.update": "Updated knowledge base entry",
  "kb.delete": "Deleted knowledge base entry",
};

export interface WriteAuditLogInput {
  // null for a platform-level action (knowledge base edits aren't scoped
  // to any one account) — see supabase/migrations/0019_audit_log.sql for
  // how RLS reads that case.
  accountId: string | null;
  actorUserId: string;
  actorEmail: string;
  action: AuditAction;
  target?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: WriteAuditLogInput,
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    account_id: input.accountId,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    action: input.action,
    target: input.target ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: AuditAction;
  target: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Account-scoped only (RLS already restricts this to the account's own
// owner) — the platform-level KB entries share this table but don't have
// a Settings-page equivalent to read them back in yet.
export async function listAuditLog(
  supabase: SupabaseClient,
  accountId: string,
  limit = 50,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, target, metadata, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    actorEmail: row.actor_email as string,
    action: row.action as AuditAction,
    target: row.target as string | null,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at as string,
  }));
}
