"use client";

import { useActionState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS, INDUSTRY_OPTIONS } from "@/lib/domain/labels";
import { createEntryAction, updateEntryAction, type EntryFormState } from "./actions";
import type { KnowledgeBaseEntryRow } from "@/lib/knowledge-base/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: EntryFormState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function EntryForm({ entry }: { entry?: KnowledgeBaseEntryRow }) {
  const action = entry ? updateEntryAction : createEntryAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="title">
          Title
        </label>
        <input id="title" name="title" required defaultValue={entry?.title} className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="serviceType">
          Service
        </label>
        <select
          id="serviceType"
          name="serviceType"
          required
          defaultValue={entry?.service_type ?? ""}
          className={fieldClass}
        >
          <option value="" disabled>
            Select a service
          </option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="industry">
          Industry (optional — leave blank for a general entry shown to every industry)
        </label>
        <select id="industry" name="industry" defaultValue={entry?.industry ?? ""} className={fieldClass}>
          <option value="">General (all industries)</option>
          {INDUSTRY_OPTIONS.filter((o) => o !== "Other").map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="content">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={8}
          defaultValue={entry?.content}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="sourceUrl">
          Source URL (optional)
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          defaultValue={entry?.source_url ?? ""}
          className={fieldClass}
        />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : entry ? "Save changes" : "Create entry"}
      </Button>
    </form>
  );
}
