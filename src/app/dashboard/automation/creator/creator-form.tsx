"use client";

import { useActionState, useState, type FormEvent } from "react";
import { SCRIPT_TYPES, type ScriptType } from "@/lib/validation/vault";
import {
  OPERATING_SYSTEMS,
  AUTH_METHODS,
  type CodeCreatorRequestInput,
  type GeneratedScript,
  type OperatingSystem,
  type AuthMethod,
} from "@/lib/validation/automation";
import { ENVIRONMENT_PROFILES, ENVIRONMENT_PROFILE_LABELS, type EnvironmentProfile } from "@/lib/domain/environment-profiles";
import { runCodeCreatorAction, promoteGeneratedScriptAction, type PromoteFormState } from "./actions";
import {
  getAutomationRequestStatus,
  historyItemTitle,
  parseCodeCreatorInput,
  type AutomationRequestRow,
  type AutomationRequestStatus,
} from "@/lib/automation/history";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GenerationProgress } from "@/components/ui/generation-progress";

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;
const codeClass = `${fieldClass} min-h-64 font-mono`;

const SCRIPT_TYPE_LABELS: Record<ScriptType, string> = {
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

const OS_LABELS: Record<OperatingSystem, string> = {
  windows: "Windows",
  linux: "Linux",
  cross_platform: "Cross-platform",
};

const AUTH_LABELS: Record<AuthMethod, string> = {
  certificate: "Certificate-based app-only auth",
  client_secret: "Client secret",
  interactive: "Interactive/delegated auth",
  managed_identity: "Managed identity",
};

// Mirrors mfa-section.tsx's EnrollState — the closest existing precedent
// for a multi-step client flow in this codebase (no generic wizard
// component exists here, by design; see the plan this build followed).
// "requirements" optionally carries a full prefill (rerunning-with-edits
// from history) — every field below still falls back to its normal
// default when prefill is absent, same as a fresh describe -> requirements
// hop.
type CreatorState =
  | { step: "describe"; description?: string; scriptType?: ScriptType }
  | { step: "requirements"; description: string; scriptType: ScriptType; prefill?: CodeCreatorRequestInput }
  | { step: "result"; request: CodeCreatorRequestInput; result: GeneratedScript }
  | { step: "error"; request: CodeCreatorRequestInput; message: string };

function statusBadge(status: AutomationRequestStatus) {
  switch (status) {
    case "succeeded":
      return <Badge tone="success">Succeeded</Badge>;
    case "failed":
      return <Badge tone="error">Failed</Badge>;
    case "timed_out":
      return <Badge tone="warning">Timed out</Badge>;
    case "processing":
      return <Badge tone="neutral">Processing…</Badge>;
  }
}

// Lives at the "describe" step — the natural landing state when you open
// Code Creator fresh, which is exactly when a past (especially a timed-
// out) request is most useful to have back without retyping it.
function RequestHistory({
  history,
  disabled,
  onRerun,
  onEdit,
}: {
  history: AutomationRequestRow[];
  disabled: boolean;
  onRerun: (input: CodeCreatorRequestInput) => void;
  onEdit: (input: CodeCreatorRequestInput) => void;
}) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <h3 className="font-medium">Recent requests</h3>
      <ul className="flex flex-col gap-2">
        {history.map((row) => {
          const input = parseCodeCreatorInput(row.input);
          const status = getAutomationRequestStatus(row);
          return (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm">
                  {input ? historyItemTitle(input.description) : "(request details unavailable)"}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {statusBadge(status)}
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                </div>
              </div>
              {input && (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => onRerun(input)}>
                    Rerun
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit(input)}>
                    Edit
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function buildDependenciesSummary(request: CodeCreatorRequestInput): string {
  const parts = [
    `Environment: ${ENVIRONMENT_PROFILE_LABELS[request.environmentProfile]}`,
    request.operatingSystem ? `OS: ${OS_LABELS[request.operatingSystem]}` : null,
    request.authMethod ? `Auth: ${AUTH_LABELS[request.authMethod]}` : null,
    request.languageVersion ? `Version: ${request.languageVersion}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

const promoteInitialState: PromoteFormState = {};

function PromoteForm({ request, result }: { request: CodeCreatorRequestInput; result: GeneratedScript }) {
  const [state, formAction, isPending] = useActionState(promoteGeneratedScriptAction, promoteInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-border p-4">
      <h3 className="font-medium">Save to Script Vault</h3>
      <input type="hidden" name="scriptType" value={request.scriptType} />
      <input type="hidden" name="content" value={result.content} />
      <input type="hidden" name="rollbackSteps" value={result.rollback} />
      <input type="hidden" name="dependencies" value={buildDependenciesSummary(request)} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="promote-name">
          Name
        </label>
        <input id="promote-name" name="name" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="promote-description">
          Description
        </label>
        <textarea
          id="promote-description"
          name="description"
          required
          defaultValue={`${request.description}\n\n${result.notes}`}
          className={textareaClass}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" id="promote-approved" name="isApprovedPattern" className="mt-0.5" />
        <span>
          <span className="font-medium">Approved Pattern</span>
          <p className="text-xs text-muted">
            Was this useful? Would you reuse it? Mark it approved so other teammates find it first, and future
            Code Creator runs can build from it.
          </p>
        </span>
      </label>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : "Save to Script Vault"}
      </Button>
    </form>
  );
}

export function CreatorForm({ history }: { history: AutomationRequestRow[] }) {
  const [state, setState] = useState<CreatorState>({ step: "describe" });
  const [submitting, setSubmitting] = useState(false);

  // Shared by the normal requirements-step submit and a history item's
  // "Rerun" — a rerun is just this same call against a stored input,
  // never a new form-fill.
  async function submitRequest(input: CodeCreatorRequestInput) {
    setSubmitting(true);
    const response = await runCodeCreatorAction(input);
    setSubmitting(false);

    if (response.error) {
      setState({ step: "error", request: input, message: response.error });
      return;
    }
    if (response.result) {
      setState({ step: "result", request: input, result: response.result });
    }
  }

  function handleDescribeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = String(formData.get("description") ?? "").trim();
    const scriptType = String(formData.get("scriptType") ?? "powershell") as ScriptType;
    if (!description) return;
    setState({ step: "requirements", description, scriptType });
  }

  function handleRequirementsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.step !== "requirements") return;
    const formData = new FormData(e.currentTarget);

    void submitRequest({
      description: state.description,
      scriptType: state.scriptType,
      environmentProfile: String(formData.get("environmentProfile") ?? "commercial") as EnvironmentProfile,
      operatingSystem: (String(formData.get("operatingSystem") ?? "") || null) as OperatingSystem | null,
      authMethod: (String(formData.get("authMethod") ?? "") || null) as AuthMethod | null,
      languageVersion: String(formData.get("languageVersion") ?? "") || null,
      outputLocation: String(formData.get("outputLocation") ?? "") || null,
      additionalContext: String(formData.get("additionalContext") ?? "") || null,
    });
  }

  if (state.step === "describe") {
    return (
      <div className="flex flex-col gap-6">
        <form onSubmit={handleDescribeSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="description">
              What do you need?
            </label>
            <p className="text-xs text-muted">
              Describe the automation in plain language — the way you&apos;d scope it for a consultant.
            </p>
            <textarea
              id="description"
              name="description"
              required
              defaultValue={state.description}
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="scriptType">
              Language
            </label>
            <select
              id="scriptType"
              name="scriptType"
              required
              defaultValue={state.scriptType ?? "powershell"}
              className={fieldClass}
            >
              {SCRIPT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SCRIPT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-fit">
            Continue
          </Button>
        </form>

        <RequestHistory
          history={history}
          disabled={submitting}
          onRerun={(input) => void submitRequest(input)}
          onEdit={(input) =>
            setState({ step: "requirements", description: input.description, scriptType: input.scriptType, prefill: input })
          }
        />
        {submitting && <GenerationProgress />}
      </div>
    );
  }

  if (state.step === "requirements") {
    const prefill = state.prefill;
    return (
      // Keyed by description so editing a different history item (a
      // different description) remounts the form with fresh
      // defaultValues — React won't otherwise re-apply defaultValue on
      // an already-mounted uncontrolled input.
      <form key={state.description} onSubmit={handleRequirementsSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="environmentProfile">
            Target environment
          </label>
          <select
            id="environmentProfile"
            name="environmentProfile"
            required
            defaultValue={prefill?.environmentProfile ?? "commercial"}
            className={fieldClass}
          >
            {ENVIRONMENT_PROFILES.map((p) => (
              <option key={p} value={p}>
                {ENVIRONMENT_PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="operatingSystem">
            Operating system (optional)
          </label>
          <select id="operatingSystem" name="operatingSystem" defaultValue={prefill?.operatingSystem ?? ""} className={fieldClass}>
            <option value="">Not specified</option>
            {OPERATING_SYSTEMS.map((os) => (
              <option key={os} value={os}>
                {OS_LABELS[os]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="authMethod">
            Auth method (optional)
          </label>
          <select id="authMethod" name="authMethod" defaultValue={prefill?.authMethod ?? ""} className={fieldClass}>
            <option value="">Not specified</option>
            {AUTH_METHODS.map((a) => (
              <option key={a} value={a}>
                {AUTH_LABELS[a]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="languageVersion">
            Language/runtime version (optional)
          </label>
          <input
            id="languageVersion"
            name="languageVersion"
            placeholder="e.g. PowerShell 7.4"
            defaultValue={prefill?.languageVersion ?? ""}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="outputLocation">
            Output location (optional)
          </label>
          <input
            id="outputLocation"
            name="outputLocation"
            placeholder="e.g. writes a CSV to the current directory"
            defaultValue={prefill?.outputLocation ?? ""}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="additionalContext">
            Additional context (optional)
          </label>
          <textarea
            id="additionalContext"
            name="additionalContext"
            defaultValue={prefill?.additionalContext ?? ""}
            className={textareaClass}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="w-fit">
            {submitting ? "Generating…" : "Generate script"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => setState({ step: "describe", description: state.description, scriptType: state.scriptType })}
          >
            Back
          </Button>
        </div>
        {submitting && <GenerationProgress />}
      </form>
    );
  }

  if (state.step === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="error">{state.message}</Alert>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() =>
            setState({ step: "requirements", description: state.request.description, scriptType: state.request.scriptType })
          }
        >
          Back to requirements
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">Generated script</h3>
        <textarea readOnly value={state.result.content} className={codeClass} />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">Implementation notes</h3>
        <p className="text-sm text-muted">{state.result.notes}</p>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">Rollback guidance</h3>
        <p className="text-sm text-muted">{state.result.rollback}</p>
      </div>

      <PromoteForm request={state.request} result={state.result} />

      <Button variant="ghost" className="w-fit" onClick={() => setState({ step: "describe" })}>
        Start over
      </Button>
    </div>
  );
}
