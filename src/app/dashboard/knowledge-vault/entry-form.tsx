"use client";

import { useActionState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { CUSTOMER_SIZE_LABELS, CUSTOMER_SIZES, VAULT_ENTRY_TYPES, VAULT_SEVERITIES } from "@/lib/validation/vault";
import { createVaultEntryAction, updateVaultEntryAction, type EntryFormState } from "./actions";
import type { VaultEntryRow } from "@/lib/vault/entries-service";
import type { ProjectRow } from "@/lib/projects/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: EntryFormState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;

const ENTRY_TYPE_LABELS: Record<(typeof VAULT_ENTRY_TYPES)[number], string> = {
  lesson_learned: "Lesson learned",
  incident: "Incident",
};

const SEVERITY_LABELS: Record<(typeof VAULT_SEVERITIES)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
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

export function EntryForm({ entry, projects }: { entry?: VaultEntryRow; projects: ProjectRow[] }) {
  const action = entry ? updateVaultEntryAction : createVaultEntryAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Basics</h2>

        <Field id="entryType" label="Type">
          <select
            id="entryType"
            name="entryType"
            required
            defaultValue={entry?.entry_type ?? "lesson_learned"}
            className={fieldClass}
          >
            {VAULT_ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="title" label="Title">
          <input id="title" name="title" required defaultValue={entry?.title} className={fieldClass} />
        </Field>

        <Field id="serviceType" label="Microsoft workload (optional)">
          <select
            id="serviceType"
            name="serviceType"
            defaultValue={entry?.service_type ?? ""}
            className={fieldClass}
          >
            <option value="">Not specific to one workload</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="tags" label="Tags" hint="Comma-separated, e.g. dlp, teams, retention">
          <input
            id="tags"
            name="tags"
            defaultValue={entry?.tags.join(", ")}
            className={fieldClass}
          />
        </Field>

        <Field id="industry" label="Industry (optional)">
          <input id="industry" name="industry" defaultValue={entry?.industry ?? ""} className={fieldClass} />
        </Field>

        <Field id="customerSize" label="Customer size (optional)">
          <select
            id="customerSize"
            name="customerSize"
            defaultValue={entry?.customer_size ?? ""}
            className={fieldClass}
          >
            <option value="">Not set</option>
            {CUSTOMER_SIZES.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="projectId" label="Source project (optional)" hint="Which engagement this came from">
          <select id="projectId" name="projectId" defaultValue={entry?.project_id ?? ""} className={fieldClass}>
            <option value="">Not linked to a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.customer_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">What happened</h2>

        <Field id="environment" label="Environment (optional)" hint="Tenant/licensing context that matters">
          <input id="environment" name="environment" defaultValue={entry?.environment ?? ""} className={fieldClass} />
        </Field>

        <Field id="symptoms" label="Symptoms (optional)">
          <textarea id="symptoms" name="symptoms" defaultValue={entry?.symptoms ?? ""} className={textareaClass} />
        </Field>

        <Field id="rootCause" label="Root cause (optional)">
          <textarea id="rootCause" name="rootCause" defaultValue={entry?.root_cause ?? ""} className={textareaClass} />
        </Field>

        <Field id="troubleshootingSteps" label="Troubleshooting steps (optional)">
          <textarea
            id="troubleshootingSteps"
            name="troubleshootingSteps"
            defaultValue={entry?.troubleshooting_steps ?? ""}
            className={textareaClass}
          />
        </Field>

        <Field id="resolution" label="Resolution (optional)">
          <textarea id="resolution" name="resolution" defaultValue={entry?.resolution ?? ""} className={textareaClass} />
        </Field>

        <Field id="validationSteps" label="Validation steps (optional)" hint="How you confirmed the fix actually worked">
          <textarea
            id="validationSteps"
            name="validationSteps"
            defaultValue={entry?.validation_steps ?? ""}
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Lesson-learned fields (leave blank for an incident entry)
        </h2>

        <Field id="preventativeControls" label="Preventative controls (optional)">
          <textarea
            id="preventativeControls"
            name="preventativeControls"
            defaultValue={entry?.preventative_controls ?? ""}
            className={textareaClass}
          />
        </Field>

        <Field id="lessonsLearned" label="Lessons learned (optional)">
          <textarea
            id="lessonsLearned"
            name="lessonsLearned"
            defaultValue={entry?.lessons_learned ?? ""}
            className={textareaClass}
          />
        </Field>

        <Field id="confidenceScore" label="Your confidence in this entry, 1-5 (optional)">
          <input
            id="confidenceScore"
            name="confidenceScore"
            type="number"
            min={1}
            max={5}
            defaultValue={entry?.confidence_score ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Incident fields (leave blank for a lesson-learned entry)
        </h2>

        <Field id="impact" label="Impact (optional)">
          <textarea id="impact" name="impact" defaultValue={entry?.impact ?? ""} className={textareaClass} />
        </Field>

        <Field id="severity" label="Severity (optional)">
          <select id="severity" name="severity" defaultValue={entry?.severity ?? ""} className={fieldClass}>
            <option value="">Not set</option>
            {VAULT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="escalationPath" label="Escalation path (optional)">
          <input id="escalationPath" name="escalationPath" defaultValue={entry?.escalation_path ?? ""} className={fieldClass} />
        </Field>

        <Field id="timeToResolutionMinutes" label="Time to resolution, in minutes (optional)">
          <input
            id="timeToResolutionMinutes"
            name="timeToResolutionMinutes"
            type="number"
            min={0}
            defaultValue={entry?.time_to_resolution_minutes ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Reference</h2>

        <Field id="sourceUrl" label="Source URL (optional)">
          <input id="sourceUrl" name="sourceUrl" type="url" defaultValue={entry?.source_url ?? ""} className={fieldClass} />
        </Field>
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : entry ? "Save changes" : "Create entry"}
      </Button>
    </form>
  );
}
