"use client";

import { useActionState } from "react";
import { closeProjectAction, type CloseProjectState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: CloseProjectState = {};

export function CloseProjectButton({
  projectId,
  customerName,
  canClose,
}: {
  projectId: string;
  customerName: string;
  canClose: boolean;
}) {
  const [state, formAction, isPending] = useActionState(closeProjectAction, initialState);

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !confirm(
              `Close "${customerName}"? This locks the project read-only — no new deliverables, no changes to services in scope. This can't be undone.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <Button type="submit" variant="secondary" size="sm" disabled={!canClose || isPending}>
          {isPending ? "Closing…" : "Close project"}
        </Button>
      </form>
      {!canClose && (
        <p className="text-xs text-muted">
          Capture at least one Knowledge Vault entry (a lesson learned or incident) for this project before
          closing it.
        </p>
      )}
      {state.error && <Alert variant="error">{state.error}</Alert>}
    </div>
  );
}
