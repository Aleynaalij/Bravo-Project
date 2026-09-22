"use client";

import { useActionState } from "react";
import { SOP_TYPE_LABELS, SOP_TYPES } from "@/lib/validation/sop";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { generateSopAction, type GenerateSopFormState } from "./actions";
import type { ProjectRow } from "@/lib/projects/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: GenerateSopFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-32`;

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

export function GenerateForm({ projects }: { projects: ProjectRow[] }) {
  const [state, formAction, isPending] = useActionState(generateSopAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field id="title" label="Title">
        <input id="title" name="title" required className={fieldClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="sopType" label="SOP type">
          <select id="sopType" name="sopType" required defaultValue={SOP_TYPES[0]} className={fieldClass}>
            {SOP_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="serviceType" label="Related service (optional)">
          <select id="serviceType" name="serviceType" defaultValue="" className={fieldClass}>
            <option value="">None</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="sourceProjectId" label="Source project (optional)" hint="Which engagement this came from">
        <select id="sourceProjectId" name="sourceProjectId" defaultValue="" className={fieldClass}>
          <option value="">Not linked to a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.customer_name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="context"
        label="Context (optional)"
        hint="Environment specifics, tools, or anything you want this SOP to reflect"
      >
        <textarea id="context" name="context" className={textareaClass} />
      </Field>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Generating…" : "Generate SOP"}
      </Button>
    </form>
  );
}
