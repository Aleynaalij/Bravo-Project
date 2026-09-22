"use client";

import { useActionState } from "react";
import { SCRIPT_TYPES } from "@/lib/validation/vault";
import { createCodingStandardAction, updateCodingStandardAction, type StandardFormState } from "./actions";
import type { CodingStandardRow } from "@/lib/automation/standards-service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: StandardFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;

const SCRIPT_TYPE_LABELS: Record<(typeof SCRIPT_TYPES)[number], string> = {
  powershell: "PowerShell",
  graph_api: "Graph API",
  kql: "KQL",
  json: "JSON",
  terraform: "Terraform",
  bicep: "Bicep",
  arm_template: "ARM Template",
};

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

export function StandardForm({ standard }: { standard?: CodingStandardRow }) {
  const action = standard ? updateCodingStandardAction : createCodingStandardAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {standard && <input type="hidden" name="id" value={standard.id} />}

      <Field id="scriptType" label="Language">
        <select
          id="scriptType"
          name="scriptType"
          required
          defaultValue={standard?.script_type ?? "powershell"}
          className={fieldClass}
        >
          {SCRIPT_TYPES.map((t) => (
            <option key={t} value={t}>
              {SCRIPT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="requiredElements"
        label="Required elements"
        hint="Comma-separated, e.g. Try/Catch, Logging, Parameter validation, Comment Help, Transcript Logging, Rollback Guidance"
      >
        <input
          id="requiredElements"
          name="requiredElements"
          defaultValue={standard?.required_elements.join(", ")}
          className={fieldClass}
        />
      </Field>

      <Field id="notes" label="Notes (optional)" hint="Freeform guidance beyond the checklist above">
        <textarea id="notes" name="notes" defaultValue={standard?.notes ?? ""} className={textareaClass} />
      </Field>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : standard ? "Save changes" : "Create standard"}
      </Button>
    </form>
  );
}
