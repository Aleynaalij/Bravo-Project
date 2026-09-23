"use client";

import { useActionState } from "react";
import { SOP_REQUIRED_HEADINGS, SOP_STATUSES, SOP_TYPE_LABELS, SOP_TYPES } from "@/lib/validation/sop";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { createSopAction, updateSopAction, type SopFormState } from "./actions";
import type { SopRow } from "@/lib/sop/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SopFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

// One textarea per SOP_REQUIRED_HEADINGS entry — a saved SOP satisfies the
// fixed 12-heading structure by construction, since this form never lets a
// user type a heading of their own (see buildSopContent's doc comment in
// src/lib/validation/sop.ts).
function findSectionText(sop: SopRow | undefined, heading: string): string {
  const section = sop?.content.sections.find((s) => s.heading === heading);
  return section?.paragraphs.join("\n\n") ?? "";
}

export function SopForm({
  sop,
  vaultEntries,
  selectedVaultEntryIds = [],
}: {
  sop?: SopRow;
  vaultEntries: { id: string; title: string }[];
  selectedVaultEntryIds?: string[];
}) {
  const action = sop ? updateSopAction : createSopAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {sop && <input type="hidden" name="id" value={sop.id} />}

      <Field id="title" label="Title">
        <input id="title" name="title" required defaultValue={sop?.title} className={fieldClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="sopType" label="SOP type">
          <select id="sopType" name="sopType" required defaultValue={sop?.sop_type ?? SOP_TYPES[0]} className={fieldClass}>
            {SOP_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="serviceType" label="Related service (optional)">
          <select id="serviceType" name="serviceType" defaultValue={sop?.service_type ?? ""} className={fieldClass}>
            <option value="">None</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="status" label="Status">
        <select id="status" name="status" required defaultValue={sop?.status ?? "draft"} className={fieldClass}>
          {SOP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "draft" ? "Draft" : "Published"}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <p className="text-sm font-medium">Sections</p>
        {SOP_REQUIRED_HEADINGS.map((heading) => (
          <Field key={heading} id={`section:${heading}`} label={heading}>
            <textarea
              id={`section:${heading}`}
              name={`section:${heading}`}
              defaultValue={findSectionText(sop, heading)}
              className={textareaClass}
              placeholder="Separate paragraphs with a blank line"
            />
          </Field>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Related vault entries (optional)</p>
        <p className="text-xs text-muted">
          Cross-reference the Lessons Learned/Incidents this SOP grew out of.
        </p>
        {vaultEntries.length === 0 ? (
          <p className="text-sm text-muted">No vault entries yet.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {vaultEntries.map((entry) => (
              <label
                key={entry.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-light hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  name="relatedVaultEntryIds"
                  value={entry.id}
                  defaultChecked={selectedVaultEntryIds.includes(entry.id)}
                  className="accent-brand"
                />
                {entry.title}
              </label>
            ))}
          </div>
        )}
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : sop ? "Save changes" : "Create SOP"}
      </Button>
    </form>
  );
}
