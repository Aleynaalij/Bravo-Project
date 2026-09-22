"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { vaultEntrySchema, normalizeTags } from "@/lib/validation/vault";
import { createVaultEntry, deleteVaultEntry, updateVaultEntry } from "@/lib/vault/entries-service";
import { writeAuditLog } from "@/lib/audit/service";

export interface EntryFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  const num = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw ? Number(raw) : null;
  };

  return vaultEntrySchema.safeParse({
    entryType: String(formData.get("entryType") ?? ""),
    title: String(formData.get("title") ?? ""),
    serviceType: String(formData.get("serviceType") ?? "") || null,
    industry: String(formData.get("industry") ?? "").trim() || null,
    projectId: String(formData.get("projectId") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    symptoms: String(formData.get("symptoms") ?? ""),
    rootCause: String(formData.get("rootCause") ?? ""),
    troubleshootingSteps: String(formData.get("troubleshootingSteps") ?? ""),
    resolution: String(formData.get("resolution") ?? ""),
    validationSteps: String(formData.get("validationSteps") ?? ""),
    preventativeControls: String(formData.get("preventativeControls") ?? ""),
    lessonsLearned: String(formData.get("lessonsLearned") ?? ""),
    impact: String(formData.get("impact") ?? ""),
    severity: String(formData.get("severity") ?? "") || null,
    escalationPath: String(formData.get("escalationPath") ?? ""),
    timeToResolutionMinutes: num("timeToResolutionMinutes"),
    confidenceScore: num("confidenceScore"),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    tags: normalizeTags(String(formData.get("tags") ?? "")),
  });
}

export async function createVaultEntryAction(
  _prevState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const entry = await createVaultEntry(supabase, accountId, user.id, user.email, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.entry.create",
    target: entry.id,
    metadata: { title: entry.title, entryType: entry.entry_type },
  });
  revalidatePath("/dashboard/knowledge-vault");
  redirect(`/dashboard/knowledge-vault/${entry.id}`);
}

export async function updateVaultEntryAction(
  _prevState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const entry = await updateVaultEntry(supabase, id, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.entry.update",
    target: entry.id,
    metadata: { title: entry.title, entryType: entry.entry_type, version: entry.version },
  });
  revalidatePath("/dashboard/knowledge-vault");
  redirect(`/dashboard/knowledge-vault/${entry.id}`);
}

export async function deleteVaultEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deleteVaultEntry(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.entry.delete",
    target: id,
  });
  revalidatePath("/dashboard/knowledge-vault");
  redirect("/dashboard/knowledge-vault");
}
