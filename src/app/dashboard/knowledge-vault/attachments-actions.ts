"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import {
  AttachmentValidationError,
  deleteVaultEntryAttachment,
  uploadVaultEntryAttachment,
} from "@/lib/vault/attachments-service";
import { writeAuditLog } from "@/lib/audit/service";

export interface AttachmentFormState {
  error?: string;
}

export async function uploadVaultEntryAttachmentAction(
  _prevState: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const vaultEntryId = String(formData.get("vaultEntryId") ?? "");
  const file = formData.get("file");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  try {
    const attachment = await uploadVaultEntryAttachment(
      supabase,
      accountId,
      vaultEntryId,
      user.id,
      user.email,
      file,
    );
    await writeAuditLog(supabase, {
      accountId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: "vault.entry.attachment_upload",
      target: vaultEntryId,
      metadata: { fileName: attachment.fileName, sizeBytes: attachment.sizeBytes },
    });
  } catch (err) {
    if (err instanceof AttachmentValidationError) return { error: err.message };
    throw err;
  }

  revalidatePath(`/dashboard/knowledge-vault/${vaultEntryId}`);
  return {};
}

export async function deleteVaultEntryAttachmentAction(formData: FormData): Promise<void> {
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const vaultEntryId = String(formData.get("vaultEntryId") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deleteVaultEntryAttachment(supabase, attachmentId);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "vault.entry.attachment_delete",
    target: attachmentId,
  });
  revalidatePath(`/dashboard/knowledge-vault/${vaultEntryId}`);
}
