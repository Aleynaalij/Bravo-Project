"use client";

import { useActionState } from "react";
import { PLAYBOOK_REQUIRED_HEADINGS, PLAYBOOK_STATUSES, PLAYBOOK_TYPE_LABELS, PLAYBOOK_TYPES } from "@/lib/validation/playbook";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { createPlaybookAction, updatePlaybookAction, type PlaybookFormState } from "./actions";
import type { PlaybookRow } from "@/lib/playbook/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: PlaybookFormState = {};

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

// One textarea per PLAYBOOK_REQUIRED_HEADINGS entry — a saved playbook
// satisfies the fixed 12-heading structure by construction, mirroring
// sop-form.tsx's findSectionText/buildSopContent approach exactly.
function findSectionText(playbook: PlaybookRow | undefined, heading: string): string {
  const section = playbook?.content.sections.find((s) => s.heading === heading);
  return section?.paragraphs.join("\n\n") ?? "";
}

export function PlaybookForm({
  playbook,
  vaultEntries,
  selectedVaultEntryIds = [],
}: {
  playbook?: PlaybookRow;
  vaultEntries: { id: string; title: string }[];
  selectedVaultEntryIds?: string[];
}) {
  const action = playbook ? updatePlaybookAction : createPlaybookAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {playbook && <input type="hidden" name="id" value={playbook.id} />}

      <Field id="title" label="Title">
        <input id="title" name="title" required defaultValue={playbook?.title} className={fieldClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="playbookType" label="Playbook type">
          <select
            id="playbookType"
            name="playbookType"
            required
            defaultValue={playbook?.playbook_type ?? PLAYBOOK_TYPES[0]}
            className={fieldClass}
          >
            {PLAYBOOK_TYPES.map((t) => (
              <option key={t} value={t}>
                {PLAYBOOK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="serviceType" label="Related service (optional)">
          <select id="serviceType" name="serviceType" defaultValue={playbook?.service_type ?? ""} className={fieldClass}>
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
        <select id="status" name="status" required defaultValue={playbook?.status ?? "draft"} className={fieldClass}>
          {PLAYBOOK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "draft" ? "Draft" : "Published"}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <p className="text-sm font-medium">Sections</p>
        {PLAYBOOK_REQUIRED_HEADINGS.map((heading) => (
          <Field key={heading} id={`section:${heading}`} label={heading}>
            <textarea
              id={`section:${heading}`}
              name={`section:${heading}`}
              defaultValue={findSectionText(playbook, heading)}
              className={textareaClass}
              placeholder="Separate paragraphs with a blank line"
            />
          </Field>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Related vault entries (optional)</p>
        <p className="text-xs text-muted">
          Cross-reference the Lessons Learned/Incidents this playbook grew out of.
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
        {isPending ? "Saving…" : playbook ? "Save changes" : "Create playbook"}
      </Button>
    </form>
  );
}
