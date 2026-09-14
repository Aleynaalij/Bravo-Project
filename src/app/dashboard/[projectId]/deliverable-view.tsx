"use client";

import { useActionState, useState } from "react";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import type { DeliverableWithContent } from "@/lib/generation/deliverables";
import { saveEditedVersionAction, type EditFormState } from "./edit-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";

const initialState: EditFormState = {};

export function DeliverableView({
  projectId,
  deliverable,
}: {
  projectId: string;
  deliverable: DeliverableWithContent;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(saveEditedVersionAction, initialState);

  // Exit edit mode once a save completes — adjusting state during render
  // (React's documented pattern) instead of an effect, since this reacts to
  // a prop/state change rather than synchronizing with an external system.
  const [lastHandledSave, setLastHandledSave] = useState(state.savedAt);
  if (state.savedAt !== lastHandledSave) {
    setLastHandledSave(state.savedAt);
    setIsEditing(false);
  }

  if (deliverable.status === "failed") {
    return (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">{DELIVERABLE_LABELS[deliverable.type]}</h3>
          <Badge tone="error">Failed</Badge>
        </div>
        <p className="text-sm text-error-text">Generation failed. Try again above.</p>
      </Card>
    );
  }

  if (deliverable.status !== "ready" || !deliverable.content) {
    return null;
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{DELIVERABLE_LABELS[deliverable.type]}</h3>
        <div className="flex items-center gap-2">
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=docx`}
          >
            DOCX
          </a>
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pdf`}
          >
            PDF
          </a>
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pptx`}
          >
            PPTX
          </a>
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <Alert variant="warning" className="mb-3">
        AI-generated draft — review before sending to a client. Not certified compliance advice.
      </Alert>

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          {deliverable.content.sections.map((section, i) => (
            <div key={i}>
              <h4 className="mb-1 text-sm font-semibold text-brand-dark">{section.heading}</h4>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mb-1 text-sm text-foreground/80">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="deliverableId" value={deliverable.id} />

          {deliverable.content.sections.map((section, i) => (
            <div key={i} className="flex flex-col gap-1">
              <input
                name="heading"
                defaultValue={section.heading}
                className="rounded-md border border-border px-2 py-1 text-sm font-semibold focus:border-brand focus:outline-none"
              />
              <textarea
                name="paragraphs"
                defaultValue={section.paragraphs.join("\n\n")}
                rows={Math.max(3, section.paragraphs.length * 2)}
                className="rounded-md border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none"
              />
              <span className="text-xs text-muted">Separate paragraphs with a blank line</span>
            </div>
          ))}

          {state.error && <Alert variant="error">{state.error}</Alert>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Saving…" : "Save edits"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
