"use client";

import { useActionState, useState, type FormEvent, type ReactNode } from "react";
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
import { promoteGeneratedScriptAction, deleteCodeCreatorRequestAction, type PromoteFormState } from "./actions";
import {
  getAutomationRequestStatus,
  historyItemTitle,
  parseCodeCreatorInput,
  type AutomationRequestRow,
  type AutomationRequestStatus,
} from "@/lib/automation/history";
import { extractStreamingScriptPreview, parseStreamedScript } from "@/lib/automation/stream-format";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Chalkboard, ChalkboardOverlay } from "@/components/ui/chalkboard";

// How long the overlay's own enter/exit keyframes run (must match the
// durations passed to animate-[...] in chalkboard.tsx) — the "closing"
// phase is kept mounted for exactly this long so the exit animation can
// finish before the caller unmounts it. COMPLETE_HOLD_MS is the extra
// pause on a successful generation so "Complete" is actually readable
// before the board fades and the result screen takes over, instead of
// the two happening in the same instant.
const OVERLAY_FADE_MS = 300;
const COMPLETE_HOLD_MS = 550;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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
              <div className="flex shrink-0 gap-2">
                {input && (
                  <>
                    <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => onRerun(input)}>
                      Rerun
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit(input)}>
                      Edit
                    </Button>
                  </>
                )}
                <form
                  action={deleteCodeCreatorRequestAction}
                  onSubmit={(e) => {
                    if (!confirm("Delete this request? This can't be undone.")) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="requestId" value={row.id} />
                  <Button type="submit" variant="danger" size="sm" disabled={disabled}>
                    Delete
                  </Button>
                </form>
              </div>
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
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [complete, setComplete] = useState(false);
  // "hidden" | "visible" | "closing" — the overlay stays mounted through
  // "closing" so its exit keyframe (chalkboard.tsx) can finish playing
  // before it's removed, instead of just vanishing.
  const [overlayPhase, setOverlayPhase] = useState<"hidden" | "visible" | "closing">("hidden");

  function closeOverlayThen(after: () => void) {
    setOverlayPhase("closing");
    setTimeout(() => {
      setOverlayPhase("hidden");
      setComplete(false);
      after();
    }, OVERLAY_FADE_MS);
  }

  // Shared by the normal requirements-step submit and a history item's
  // "Rerun" — a rerun is just this same call against a stored input,
  // never a new form-fill. Streams from the Route Handler (not a Server
  // Action — those can't stream a response back) so the chalkboard can
  // show the script arriving live; stream-format.ts's delimiter parser
  // is what turns the raw streamed text into content/notes/rollback,
  // both incrementally (extractStreamingScriptPreview, for what's shown
  // while it's still arriving) and once the stream ends
  // (parseStreamedScript, for the final result). The overlay pops in as
  // soon as generation starts and holds on a "Complete" state for a beat
  // once it's done, so finishing reads as a transition rather than the
  // board just disappearing.
  async function submitRequest(input: CodeCreatorRequestInput) {
    setOverlayPhase("visible");
    setComplete(false);
    setStreaming(true);
    setStreamedText("");
    let raw = "";

    try {
      const response = await fetch("/api/automation/creator/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok || !response.body) {
        const message = await response.text();
        setStreaming(false);
        closeOverlayThen(() => setState({ step: "error", request: input, message: message || "Something went wrong." }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setStreamedText(raw);
      }
    } catch {
      setStreaming(false);
      closeOverlayThen(() =>
        setState({ step: "error", request: input, message: "Lost connection while generating — try again." }),
      );
      return;
    }

    setStreaming(false);
    const parsed = parseStreamedScript(raw);
    if (!parsed) {
      closeOverlayThen(() =>
        setState({
          step: "error",
          request: input,
          message: "The generated response wasn't in the expected format — try again.",
        }),
      );
      return;
    }

    setComplete(true);
    await wait(COMPLETE_HOLD_MS);
    closeOverlayThen(() => setState({ step: "result", request: input, result: parsed }));
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

  let content: ReactNode;

  if (state.step === "describe") {
    content = (
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
          disabled={streaming}
          onRerun={(input) => void submitRequest(input)}
          onEdit={(input) =>
            setState({ step: "requirements", description: input.description, scriptType: input.scriptType, prefill: input })
          }
        />
      </div>
    );
  } else if (state.step === "requirements") {
    const prefill = state.prefill;
    content = (
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
          <Button type="submit" disabled={streaming} className="w-fit">
            {streaming ? "Generating…" : "Generate script"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={streaming}
            onClick={() => setState({ step: "describe", description: state.description, scriptType: state.scriptType })}
          >
            Back
          </Button>
        </div>
      </form>
    );
  } else if (state.step === "error") {
    content = (
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
  } else {
    content = (
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

  return (
    <>
      {content}
      {overlayPhase !== "hidden" && (
        <ChalkboardOverlay show={overlayPhase === "visible"}>
          <Chalkboard text={extractStreamingScriptPreview(streamedText)} streaming={streaming} complete={complete} />
        </ChalkboardOverlay>
      )}
    </>
  );
}
