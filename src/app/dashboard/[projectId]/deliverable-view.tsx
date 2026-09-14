"use client";

import { useActionState, useState } from "react";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import type { DeliverableWithContent } from "@/lib/generation/deliverables";
import { saveEditedVersionAction, type EditFormState } from "./edit-actions";

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
      <div className="rounded-md border px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">{DELIVERABLE_LABELS[deliverable.type]}</h3>
          <span className="text-xs uppercase text-gray-500">failed</span>
        </div>
        <p className="text-sm text-red-700">Generation failed. Try again above.</p>
      </div>
    );
  }

  if (deliverable.status !== "ready" || !deliverable.content) {
    return null;
  }

  return (
    <div className="rounded-md border px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{DELIVERABLE_LABELS[deliverable.type]}</h3>
        <div className="flex items-center gap-3 text-xs">
          <a
            className="underline"
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=docx`}
          >
            Download DOCX
          </a>
          <a
            className="underline"
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pdf`}
          >
            Download PDF
          </a>
          <a
            className="underline"
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pptx`}
          >
            Download PPTX
          </a>
          {!isEditing && (
            <button type="button" className="underline" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </div>

      <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
        AI-generated draft — review before sending to a client. Not certified compliance advice.
      </p>

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          {deliverable.content.sections.map((section, i) => (
            <div key={i}>
              <h4 className="mb-1 text-sm font-semibold">{section.heading}</h4>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mb-1 text-sm text-gray-700">
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
                className="rounded-md border px-2 py-1 text-sm font-semibold"
              />
              <textarea
                name="paragraphs"
                defaultValue={section.paragraphs.join("\n\n")}
                rows={Math.max(3, section.paragraphs.length * 2)}
                className="rounded-md border px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-500">Separate paragraphs with a blank line</span>
            </div>
          ))}

          {state.error && <p className="text-sm text-red-700">{state.error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save edits"}
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
