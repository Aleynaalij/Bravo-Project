import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "vault-attachments";

// A practical cap for the kind of file this feature is meant for
// (a screenshot, a log excerpt, a small PDF/Office doc) — not a hard
// platform limit, just a sensible ceiling that keeps this a lightweight
// attachment feature rather than a general file-storage product.
export const ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 5;

// A whitelist rather than a blocklist — deliberately excludes anything
// executable (scripts, binaries) so this stays "supporting evidence for
// an entry," not a second, unreviewed script-distribution path alongside
// the Script Vault's own explicit, metadata-rich table.
export const ATTACHMENT_ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export interface VaultEntryAttachment {
  id: string;
  knowledgeVaultEntryId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByEmail: string;
  createdAt: string;
  // A time-limited signed URL, generated fresh on every list call — the
  // bucket is private, so there's no stable public URL to store.
  downloadUrl: string | null;
}

interface AttachmentRow {
  id: string;
  knowledge_vault_entry_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_email: string;
  created_at: string;
}

const ATTACHMENT_COLUMNS =
  "id, knowledge_vault_entry_id, storage_path, file_name, content_type, size_bytes, uploaded_by_email, created_at";

// One hour — long enough that a page left open doesn't go stale mid-
// session, short enough that a copied link doesn't stay valid forever.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export async function listVaultEntryAttachments(
  supabase: SupabaseClient,
  vaultEntryId: string,
): Promise<VaultEntryAttachment[]> {
  const { data, error } = await supabase
    .from("vault_entry_attachments")
    .select<string, AttachmentRow>(ATTACHMENT_COLUMNS)
    .eq("knowledge_vault_entry_id", vaultEntryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRY_SECONDS);
      return {
        id: row.id,
        knowledgeVaultEntryId: row.knowledge_vault_entry_id,
        fileName: row.file_name,
        contentType: row.content_type,
        sizeBytes: row.size_bytes,
        uploadedByEmail: row.uploaded_by_email,
        createdAt: row.created_at,
        downloadUrl: signed?.signedUrl ?? null,
      };
    }),
  );
}

export class AttachmentValidationError extends Error {}

// Validates, uploads to Storage, then inserts the metadata row — in that
// order, so a rejected file never reaches Storage and a failed upload
// never leaves an orphaned metadata row. The account_id segment of the
// storage path comes from the authenticated caller's own account, never
// from client input, since that's what storage.objects' RLS trusts (see
// migration 0039's own comment).
export async function uploadVaultEntryAttachment(
  supabase: SupabaseClient,
  accountId: string,
  vaultEntryId: string,
  uploadedByUserId: string,
  uploadedByEmail: string,
  file: File,
): Promise<VaultEntryAttachment> {
  if (file.size === 0) {
    throw new AttachmentValidationError("That file is empty.");
  }
  if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
    throw new AttachmentValidationError(
      `That file is too large — the limit is ${ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB.`,
    );
  }
  if (!ATTACHMENT_ALLOWED_CONTENT_TYPES.includes(file.type)) {
    throw new AttachmentValidationError(
      "That file type isn't supported. Try an image, PDF, text/CSV file, Office document, or zip archive.",
    );
  }

  const { count, error: countError } = await supabase
    .from("vault_entry_attachments")
    .select("id", { count: "exact", head: true })
    .eq("knowledge_vault_entry_id", vaultEntryId);
  if (countError) throw countError;
  if ((count ?? 0) >= ATTACHMENT_MAX_COUNT) {
    throw new AttachmentValidationError(`An entry can have at most ${ATTACHMENT_MAX_COUNT} attachments.`);
  }

  // Strips anything that isn't a plain filename character so the storage
  // path can't be used for path traversal or to smuggle a foldername
  // component — the original name is still stored as-is in file_name for
  // display.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
  const storagePath = `${accountId}/${vaultEntryId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vault_entry_attachments")
    .insert({
      knowledge_vault_entry_id: vaultEntryId,
      storage_path: storagePath,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      uploaded_by_user_id: uploadedByUserId,
      uploaded_by_email: uploadedByEmail,
    })
    .select<string, AttachmentRow>(ATTACHMENT_COLUMNS)
    .single();
  if (error) {
    // The metadata insert failed after the file was already uploaded —
    // clean up the orphaned object rather than leaving it unreferenced.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  return {
    id: data.id,
    knowledgeVaultEntryId: data.knowledge_vault_entry_id,
    fileName: data.file_name,
    contentType: data.content_type,
    sizeBytes: data.size_bytes,
    uploadedByEmail: data.uploaded_by_email,
    createdAt: data.created_at,
    downloadUrl: null,
  };
}

export async function deleteVaultEntryAttachment(supabase: SupabaseClient, attachmentId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("vault_entry_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return;

  const { error: deleteError } = await supabase.from("vault_entry_attachments").delete().eq("id", attachmentId);
  if (deleteError) throw deleteError;

  await supabase.storage.from(BUCKET).remove([existing.storage_path]);
}
