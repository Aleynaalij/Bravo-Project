"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { knowledgeBaseEntrySchema } from "@/lib/validation/knowledge-base";
import {
  createKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
} from "@/lib/knowledge-base/service";
import { writeAuditLog } from "@/lib/audit/service";

export interface EntryFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  return knowledgeBaseEntrySchema.safeParse({
    title: String(formData.get("title") ?? ""),
    serviceType: String(formData.get("serviceType") ?? ""),
    industry: String(formData.get("industry") ?? "").trim() || null,
    content: String(formData.get("content") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
  });
}

export async function createEntryAction(
  _prevState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const supabase = await createClient();
  const { userId, email } = await requirePlatformAdmin(supabase);

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  const entry = await createKnowledgeBaseEntry(supabase, parsed.data);
  // account_id null — a platform-admin action, not scoped to any one
  // account (see supabase/migrations/0019_audit_log.sql).
  await writeAuditLog(supabase, {
    accountId: null,
    actorUserId: userId,
    actorEmail: email,
    action: "kb.create",
    target: entry.id,
    metadata: { title: entry.title, serviceType: entry.service_type },
  });
  revalidatePath("/admin/knowledge-base");
  redirect("/admin/knowledge-base");
}

export async function updateEntryAction(
  _prevState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { userId, email } = await requirePlatformAdmin(supabase);

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  const entry = await updateKnowledgeBaseEntry(supabase, id, parsed.data);
  await writeAuditLog(supabase, {
    accountId: null,
    actorUserId: userId,
    actorEmail: email,
    action: "kb.update",
    target: entry.id,
    metadata: { title: entry.title, serviceType: entry.service_type, version: entry.version },
  });
  revalidatePath("/admin/knowledge-base");
  redirect("/admin/knowledge-base");
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { userId, email } = await requirePlatformAdmin(supabase);

  await deleteKnowledgeBaseEntry(supabase, id);
  await writeAuditLog(supabase, {
    accountId: null,
    actorUserId: userId,
    actorEmail: email,
    action: "kb.delete",
    target: id,
  });
  revalidatePath("/admin/knowledge-base");
  redirect("/admin/knowledge-base");
}
