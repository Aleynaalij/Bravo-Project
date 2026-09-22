"use client";

import { useActionState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { SCRIPT_TYPES, SCRIPT_RISK_LEVELS } from "@/lib/validation/vault";
import { createVaultScriptAction, updateVaultScriptAction, type ScriptFormState } from "./actions";
import type { VaultScriptRow } from "@/lib/vault/scripts-service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: ScriptFormState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;
const codeClass = `${fieldClass} min-h-48 font-mono`;

const SCRIPT_TYPE_LABELS: Record<(typeof SCRIPT_TYPES)[number], string> = {
  powershell: "PowerShell",
  python: "Python",
  javascript: "JavaScript",
  bash: "Bash",
  graph_api: "Graph API",
  kql: "KQL",
  json: "JSON",
  terraform: "Terraform",
  bicep: "Bicep",
  arm_template: "ARM Template",
};

const RISK_LABELS: Record<(typeof SCRIPT_RISK_LEVELS)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
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

export function ScriptForm({ script }: { script?: VaultScriptRow }) {
  const action = script ? updateVaultScriptAction : createVaultScriptAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {script && <input type="hidden" name="id" value={script.id} />}

      <Field id="name" label="Name">
        <input id="name" name="name" required defaultValue={script?.name} className={fieldClass} />
      </Field>

      <Field id="description" label="Description" hint="What this script does and when to use it">
        <textarea
          id="description"
          name="description"
          required
          defaultValue={script?.description}
          className={textareaClass}
        />
      </Field>

      <Field id="scriptType" label="Type">
        <select id="scriptType" name="scriptType" required defaultValue={script?.script_type ?? "powershell"} className={fieldClass}>
          {SCRIPT_TYPES.map((t) => (
            <option key={t} value={t}>
              {SCRIPT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="serviceType" label="Microsoft workload (optional)">
        <select id="serviceType" name="serviceType" defaultValue={script?.service_type ?? ""} className={fieldClass}>
          <option value="">Not specific to one workload</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="riskLevel" label="Risk level">
        <select id="riskLevel" name="riskLevel" required defaultValue={script?.risk_level ?? "medium"} className={fieldClass}>
          {SCRIPT_RISK_LEVELS.map((r) => (
            <option key={r} value={r}>
              {RISK_LABELS[r]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="tags" label="Tags" hint="Comma-separated, e.g. dlp, teams, retention">
        <input id="tags" name="tags" defaultValue={script?.tags.join(", ")} className={fieldClass} />
      </Field>

      <Field id="content" label="Script content">
        <textarea id="content" name="content" required defaultValue={script?.content} className={codeClass} />
      </Field>

      <Field id="dependencies" label="Dependencies (optional)" hint="Modules, permissions, or prerequisites">
        <textarea id="dependencies" name="dependencies" defaultValue={script?.dependencies ?? ""} className={textareaClass} />
      </Field>

      <Field id="validationSteps" label="Validation steps (optional)" hint="How to confirm it worked">
        <textarea
          id="validationSteps"
          name="validationSteps"
          defaultValue={script?.validation_steps ?? ""}
          className={textareaClass}
        />
      </Field>

      <Field id="rollbackSteps" label="Rollback steps (optional)">
        <textarea
          id="rollbackSteps"
          name="rollbackSteps"
          defaultValue={script?.rollback_steps ?? ""}
          className={textareaClass}
        />
      </Field>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : script ? "Save changes" : "Create script"}
      </Button>
    </form>
  );
}
