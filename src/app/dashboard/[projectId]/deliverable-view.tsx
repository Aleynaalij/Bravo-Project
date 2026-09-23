"use client";

import { useActionState, useState } from "react";
import { DELIVERABLE_LABELS, DELIVERABLE_CATEGORY, isCodeDeliverable } from "@/lib/domain/labels";
import type { DeliverableWithContent } from "@/lib/generation/deliverables";
import {
  DELIVERABLE_REVIEW_STATUS_LABELS,
  canExportForClient,
  canSubmitForReview,
  canDecideReview,
  type DeliverableReviewStatus,
} from "@/lib/generation/review";
import { saveEditedVersionAction, type EditFormState } from "./edit-actions";
import {
  submitForReviewAction,
  approveDeliverableAction,
  requestChangesAction,
  type ReviewActionState,
} from "./review-actions";
import { ArchitectureDiagramView } from "@/components/architecture-diagram";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
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

const REVIEW_STATUS_TONE: Record<DeliverableReviewStatus, BadgeTone> = {
  not_submitted: "neutral",
  in_review: "brand",
  approved: "success",
  changes_requested: "warning",
};

const initialState: EditFormState = {};
const reviewInitialState: ReviewActionState = {};

// The approval workflow's controls — badge + whichever action(s) the
// current review_status allows. Lives as its own component (rather than
// inline in DeliverableView) since it needs three independent
// useActionState hooks of its own; keeping them here instead of the
// parent avoids DeliverableView re-rendering on every keystroke of the
// (rarely used) request-changes note.
function ReviewControls({ projectId, deliverable }: { projectId: string; deliverable: DeliverableWithContent }) {
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [submitState, submitAction, isSubmitting] = useActionState(submitForReviewAction, reviewInitialState);
  const [approveState, approveAction, isApproving] = useActionState(approveDeliverableAction, reviewInitialState);
  const [changesState, changesAction, isRequestingChangesPending] = useActionState(
    requestChangesAction,
    reviewInitialState,
  );

  const attribution: string[] = [];
  if (deliverable.submittedByEmail && deliverable.submittedAt) {
    attribution.push(`Submitted by ${deliverable.submittedByEmail} on ${new Date(deliverable.submittedAt).toLocaleDateString()}`);
  }
  if (deliverable.reviewedByEmail && deliverable.reviewedAt) {
    const verb = deliverable.reviewStatus === "approved" ? "Approved" : "Reviewed";
    attribution.push(`${verb} by ${deliverable.reviewedByEmail} on ${new Date(deliverable.reviewedAt).toLocaleDateString()}`);
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Review status</span>
          <Badge tone={REVIEW_STATUS_TONE[deliverable.reviewStatus]}>
            {DELIVERABLE_REVIEW_STATUS_LABELS[deliverable.reviewStatus]}
          </Badge>
        </div>

        {canSubmitForReview(deliverable.status, deliverable.reviewStatus) && (
          <form action={submitAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="deliverableId" value={deliverable.id} />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit for review"}
            </Button>
          </form>
        )}

        {canDecideReview(deliverable.reviewStatus) && !isRequestingChanges && (
          <div className="flex gap-2">
            <form action={approveAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="deliverableId" value={deliverable.id} />
              <Button type="submit" size="sm" disabled={isApproving}>
                {isApproving ? "Approving…" : "Approve"}
              </Button>
            </form>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsRequestingChanges(true)}>
              Request changes
            </Button>
          </div>
        )}
      </div>

      {attribution.length > 0 && (
        <div className="flex flex-col gap-0.5 text-xs text-muted">
          {attribution.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}

      {deliverable.reviewStatus === "changes_requested" && deliverable.reviewNote && (
        <p className="rounded-md bg-warning-bg px-2 py-1.5 text-sm text-warning-text">{deliverable.reviewNote}</p>
      )}

      {!canExportForClient(deliverable.reviewStatus) && (
        <p className="text-xs text-muted">Approve this deliverable to unlock DOCX/PDF/PPTX export.</p>
      )}

      {canDecideReview(deliverable.reviewStatus) && isRequestingChanges && (
        <form action={changesAction} className="flex flex-col gap-2 border-t border-border pt-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <textarea
            name="reviewNote"
            placeholder="What needs to change? (optional, but the submitter will see it)"
            rows={3}
            className="rounded-md border border-border px-2 py-1 text-sm focus:border-brand focus:outline-none"
          />
          {changesState.error && <Alert variant="error">{changesState.error}</Alert>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isRequestingChangesPending}>
              {isRequestingChangesPending ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRequestingChanges(false)}
              disabled={isRequestingChangesPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {submitState.error && <Alert variant="error">{submitState.error}</Alert>}
      {approveState.error && <Alert variant="error">{approveState.error}</Alert>}
    </div>
  );
}

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
          {canExportForClient(deliverable.reviewStatus) ? (
            <>
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
            </>
          ) : (
            <>
              <span className={`${buttonClasses("secondary", "sm")} pointer-events-none opacity-50`} aria-disabled="true">
                <DocxIcon className="h-3.5 w-3.5" />
                DOCX
              </span>
              <span className={`${buttonClasses("secondary", "sm")} pointer-events-none opacity-50`} aria-disabled="true">
                <PdfIcon className="h-3.5 w-3.5" />
                PDF
              </span>
              <span className={`${buttonClasses("secondary", "sm")} pointer-events-none opacity-50`} aria-disabled="true">
                <PptxIcon className="h-3.5 w-3.5" />
                PPTX
              </span>
            </>
          )}
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <ReviewControls projectId={projectId} deliverable={deliverable} />

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
