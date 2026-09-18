"use client";

import { useActionState, useState } from "react";
import { updateOrganizationNameAction, type OrganizationActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: OrganizationActionState = {};

// A copy-to-clipboard affordance for the account's own id — the only place
// in the app a consultant can see it, useful for support correspondence.
// No feedback library here, just a small local "Copied" state.
function CopyableAccountId({ accountId }: { accountId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(accountId);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard access can be denied (permissions, non-secure
          // context) — the id is still visible as selectable text either
          // way, so there's nothing else to do here.
        }
      }}
      className="group flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs hover:border-brand"
      title="Copy account ID"
    >
      {accountId}
      <span className="text-muted group-hover:text-brand">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function OrganizationSection({
  accountId,
  firmName,
  createdAt,
  isOwner,
}: {
  accountId: string;
  firmName: string | null;
  createdAt: string;
  isOwner: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateOrganizationNameAction, initialState);
  const [isEditing, setIsEditing] = useState(false);

  // Collapse back to the read-only summary once a save actually completes
  // (savedAt changes) — see the OrganizationActionState comment in
  // actions.ts for why savedAt, not a plain success flag, is what this
  // compares. Adjusting state during render (React's documented pattern)
  // rather than an effect, matching deliverable-view.tsx's identical case.
  const [lastHandledSave, setLastHandledSave] = useState(state.savedAt);
  if (state.savedAt !== lastHandledSave) {
    setLastHandledSave(state.savedAt);
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Organization name</dt>
          {isEditing ? null : (
            <dd className="flex items-center gap-2">
              <span className={firmName ? "" : "italic text-muted"}>
                {firmName ?? "Not set"}
              </span>
              {isOwner && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  {firmName ? "Edit" : "Add"}
                </Button>
              )}
            </dd>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Account ID</dt>
          <dd>
            <CopyableAccountId accountId={accountId} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Created</dt>
          <dd>{new Date(createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      {isEditing && (
        <form
          action={formAction}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="firmName">
              Organization name
            </label>
            <input
              id="firmName"
              name="firmName"
              defaultValue={firmName ?? ""}
              required
              autoFocus
              className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isPending}>
            Cancel
          </Button>
        </form>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}
    </div>
  );
}
