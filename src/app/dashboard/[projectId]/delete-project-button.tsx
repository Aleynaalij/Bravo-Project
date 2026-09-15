"use client";

import { deleteProjectAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({
  projectId,
  customerName,
}: {
  projectId: string;
  customerName: string;
}) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${customerName}"? This permanently removes the project and every generated deliverable. This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" variant="danger" size="sm">
        Delete project
      </Button>
    </form>
  );
}
