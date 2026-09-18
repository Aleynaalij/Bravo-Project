"use client";

import { useActionState, useState } from "react";
import { DELIVERABLE_LABELS, DELIVERABLE_CATEGORY, isCodeDeliverable } from "@/lib/domain/labels";
import type { DeliverableWithContent } from "@/lib/generation/deliverables";
import { saveEditedVersionAction, type EditFormState } from "./edit-actions";
import { ArchitectureDiagramView } from "@/components/architecture-diagram";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  DocxIcon,
  PdfIcon,
  PptxIcon,
  CoreDeliverableIcon,
  DesignDeliverableIcon,
  ProcessDeliverableIcon,
  ComplianceDeliverableIcon,
  AutomationDeliverableIcon,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { DeliverableCategory } from "@/lib/domain/labels";

const CATEGORY_ICONS: Record<DeliverableCategory, ComponentType<SVGProps<SVGSVGElement>>> = {
  core: CoreDeliverableIcon,
  design: DesignDeliverableIcon,
  process: ProcessDeliverableIcon,
  compliance: ComplianceDeliverableIcon,
  automation: AutomationDeliverableIcon,
};

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

  const CategoryIcon = CATEGORY_ICONS[DELIVERABLE_CATEGORY[deliverable.type]];
  const isCode = isCodeDeliverable(deliverable.type);

  if (deliverable.status === "failed") {
    return (
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <CategoryIcon className="h-4 w-4 text-muted" />
            {DELIVERABLE_LABELS[deliverable.type]}
          </h3>
          <Badge tone="error">Failed</Badge>
        </div>
        <p className="text-sm text-error-text">Generation failed. Try again above.</p>
      </Card>
    );
  }

  if (deliverable.status === "generating" || deliverable.status === "pending") {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <CategoryIcon className="h-4 w-4 text-muted" />
            {DELIVERABLE_LABELS[deliverable.type]}
          </h3>
          <Badge tone="brand">Generating&hellip;</Badge>
        </div>
      </Card>
    );
  }

  if (deliverable.status !== "ready" || !deliverable.content) {
    return null;
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <CategoryIcon className="h-4 w-4 text-muted" />
          {DELIVERABLE_LABELS[deliverable.type]}
        </h3>
        <div className="flex items-center gap-2">
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=docx`}
          >
            <DocxIcon className="h-3.5 w-3.5" />
            DOCX
          </a>
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pdf`}
          >
            <PdfIcon className="h-3.5 w-3.5" />
            PDF
          </a>
          <a
            className={buttonClasses("secondary", "sm")}
            href={`/api/projects/${projectId}/deliverables/${deliverable.id}/export?format=pptx`}
          >
            <PptxIcon className="h-3.5 w-3.5" />
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
              {isCode ? (
                // Joined rather than one <pre> per paragraph: the edit-save
                // path (edit-actions.ts) splits saved text on blank lines,
                // so a script with intentional blank lines can come back as
                // several paragraph entries — re-joining with the same
                // separator reassembles exactly one continuous script,
                // whether it's stored as 1 paragraph or several.
                <pre className="mb-1 overflow-x-auto rounded-md bg-surface-hover p-3 font-mono text-xs text-foreground/80">
                  {section.paragraphs.join("\n\n")}
                </pre>
              ) : (
                section.paragraphs.map((p, j) => (
                  <p key={j} className="mb-1 text-sm text-foreground/80">
                    {p}
                  </p>
                ))
              )}
            </div>
          ))}
          {deliverable.content.diagram && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-brand-dark">
                {deliverable.content.diagram.title || "Architecture Diagram"}
              </h4>
              <ArchitectureDiagramView diagram={deliverable.content.diagram} />
            </div>
          )}
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
                rows={isCode ? Math.max(8, section.paragraphs.join("\n\n").split("\n").length + 2) : Math.max(3, section.paragraphs.length * 2)}
                className={`rounded-md border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none ${isCode ? "font-mono text-xs" : ""}`}
              />
              <span className="text-xs text-muted">
                {isCode
                  ? "This is a script — a blank line inside it will be treated as a paragraph break, which is harmless (it's rejoined on save/display), but keep edits intentional."
                  : "Separate paragraphs with a blank line"}
              </span>
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
