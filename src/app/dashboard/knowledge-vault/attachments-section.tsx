"use client";

import { useActionState } from "react";
import {
  uploadVaultEntryAttachmentAction,
  deleteVaultEntryAttachmentAction,
  type AttachmentFormState,
} from "./attachments-actions";
import { ATTACHMENT_MAX_COUNT, ATTACHMENT_MAX_SIZE_BYTES, type VaultEntryAttachment } from "@/lib/vault/attachments-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: AttachmentFormState = {};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({
  vaultEntryId,
  attachments,
}: {
  vaultEntryId: string;
  attachments: VaultEntryAttachment[];
}) {
  const [state, formAction, isPending] = useActionState(uploadVaultEntryAttachmentAction, initialState);
  const atLimit = attachments.length >= ATTACHMENT_MAX_COUNT;

  return (
    <Card className="mb-6 flex flex-col gap-3">
      <h2 className="font-medium">Attachments</h2>
      <p className="text-sm text-muted">
        Screenshots, logs, or small documents that support this entry — up to {ATTACHMENT_MAX_COUNT} files,{" "}
        {ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB each.
      </p>

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
            >
              <span className="flex min-w-0 flex-col">
                {attachment.downloadUrl ? (
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-brand hover:underline"
                  >
                    {attachment.fileName}
                  </a>
                ) : (
                  <span className="truncate">{attachment.fileName}</span>
                )}
                <span className="text-xs text-muted">
                  {formatSize(attachment.sizeBytes)} &middot; {attachment.uploadedByEmail}
                </span>
              </span>
              <form action={deleteVaultEntryAttachmentAction}>
                <input type="hidden" name="attachmentId" value={attachment.id} />
                <input type="hidden" name="vaultEntryId" value={vaultEntryId} />
                <Button type="submit" variant="danger" size="sm">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="border-t border-border pt-3 text-sm text-muted">
          This entry has reached the {ATTACHMENT_MAX_COUNT}-attachment limit — remove one to upload another.
        </p>
      ) : (
        <form action={formAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="hidden" name="vaultEntryId" value={vaultEntryId} />
          <input type="file" name="file" required className="text-sm" />
          <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
            {isPending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}
    </Card>
  );
}
