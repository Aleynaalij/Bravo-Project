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
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
type CreatorState =
  | { step: "describe"; description?: string; scriptType?: ScriptType }
  | { step: "requirements"; description: string; scriptType: ScriptType }
  | { step: "result"; request: CodeCreatorRequestInput; result: GeneratedScript }
  | { step: "error"; request: CodeCreatorRequestInput; message: string };

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

export function CreatorForm() {
  const [state, setState] = useState<CreatorState>({ step: "describe" });
  const [submitting, setSubmitting] = useState(false);

  function handleDescribeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = String(formData.get("description") ?? "").trim();
    const scriptType = String(formData.get("scriptType") ?? "powershell") as ScriptType;
    if (!description) return;
    setState({ step: "requirements", description, scriptType });
  }

  async function handleRequirementsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.step !== "requirements") return;
    const formData = new FormData(e.currentTarget);

    const input: CodeCreatorRequestInput = {
      description: state.description,
      scriptType: state.scriptType,
      environmentProfile: String(formData.get("environmentProfile") ?? "commercial") as EnvironmentProfile,
      operatingSystem: (String(formData.get("operatingSystem") ?? "") || null) as OperatingSystem | null,
      authMethod: (String(formData.get("authMethod") ?? "") || null) as AuthMethod | null,
      languageVersion: String(formData.get("languageVersion") ?? "") || null,
      outputLocation: String(formData.get("outputLocation") ?? "") || null,
      additionalContext: String(formData.get("additionalContext") ?? "") || null,
    };

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

  if (state.step === "describe") {
    return (
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
    );
  }

  if (state.step === "requirements") {
    return (
      <form onSubmit={handleRequirementsSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="environmentProfile">
            Target environment
          </label>
          <select id="environmentProfile" name="environmentProfile" required defaultValue="commercial" className={fieldClass}>
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
          <select id="operatingSystem" name="operatingSystem" defaultValue="" className={fieldClass}>
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
          <select id="authMethod" name="authMethod" defaultValue="" className={fieldClass}>
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
          <input id="languageVersion" name="languageVersion" placeholder="e.g. PowerShell 7.4" className={fieldClass} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="outputLocation">
            Output location (optional)
          </label>
          <input
            id="outputLocation"
            name="outputLocation"
            placeholder="e.g. writes a CSV to the current directory"
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="additionalContext">
            Additional context (optional)
          </label>
          <textarea id="additionalContext" name="additionalContext" className={textareaClass} />
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
