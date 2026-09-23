"use client";

import { useActionState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import type { TroubleshootLikelihood, TroubleshootResult } from "@/lib/validation/troubleshoot";
import { runTroubleshootAction, type TroubleshootFormState } from "./actions";
import type { ProjectRow } from "@/lib/projects/service";
import type { VaultEntryRow } from "@/lib/vault/entries-service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreBar } from "@/components/charts/score-bar";
import type { ChartTone } from "@/components/charts/tone";

const initialState: TroubleshootFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;

const LIKELIHOOD_TONE: Record<TroubleshootLikelihood, BadgeTone> = {
  low: "neutral",
  medium: "warning",
  high: "error",
};

function confidenceTone(value: number): ChartTone {
  return value >= 80 ? "success" : value >= 50 ? "warning" : "error";
}

// ChartTone's three values ("success" | "warning" | "error") are each also
// valid BadgeTone values, so this identity map covers both the ScoreBar
// fill and the Badge next to it from one confidenceTone() call.
const CONFIDENCE_BADGE_TONE: Record<ChartTone, BadgeTone> = {
  success: "success",
  warning: "warning",
  error: "error",
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

function TroubleshootResultView({
  result,
  similarIssues,
}: {
  result: TroubleshootResult;
  similarIssues: VaultEntryRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Confidence</h3>
          <Badge tone={CONFIDENCE_BADGE_TONE[confidenceTone(result.confidenceScore)]}>
            {result.confidenceScore}/100
          </Badge>
        </div>
        <ScoreBar value={result.confidenceScore} tone={confidenceTone(result.confidenceScore)} />
      </div>

      {similarIssues.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Similar historical issues</h3>
          <p className="text-xs text-muted">
            Real entries from this account&apos;s own Knowledge Vault, not AI-generated.
          </p>
          <ul className="flex flex-col gap-2">
            {similarIssues.map((entry) => (
              <li key={entry.id}>
                <Card className="text-sm">
                  <span className="font-medium">{entry.title}</span>
                  {entry.resolution && <p className="mt-1 text-muted">{entry.resolution}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Potential causes</h3>
        <ul className="flex flex-col gap-2">
          {result.potentialCauses.map((cause, i) => (
            <li key={i} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Badge tone={LIKELIHOOD_TONE[cause.likelihood]}>{cause.likelihood}</Badge>
                <span className="text-sm font-medium">{cause.title}</span>
              </div>
              <p className="text-sm text-muted">{cause.explanation}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Troubleshooting flow</h3>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {result.troubleshootingFlow.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {result.requiredValidation.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Required validation</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.requiredValidation.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {result.suggestedCommands.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Suggested commands</h3>
          <ul className="flex flex-col gap-2">
            {result.suggestedCommands.map((cmd, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className="text-sm text-muted">{cmd.description}</p>
                <pre className="overflow-x-auto rounded-md bg-surface-hover p-2 text-xs">{cmd.command}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.architectureConcerns.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Architecture concerns</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.architectureConcerns.map((concern, i) => (
              <li key={i}>{concern}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Escalation path</h3>
        <p className="text-sm text-muted">{result.escalationPath}</p>
      </div>
    </div>
  );
}

export function TroubleshootForm({ projects }: { projects: ProjectRow[] }) {
  const [state, formAction, isPending] = useActionState(runTroubleshootAction, initialState);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-6">
        <Field id="problemStatement" label="Problem statement">
          <textarea id="problemStatement" name="problemStatement" required className={textareaClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <Field id="projectId" label="Project (optional)">
            <select id="projectId" name="projectId" defaultValue="" className={fieldClass}>
              <option value="">Not linked to a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.customer_name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field id="environment" label="Environment (optional)">
          <textarea id="environment" name="environment" className={textareaClass} />
        </Field>

        <Field id="licensing" label="Licensing (optional)">
          <input id="licensing" name="licensing" className={fieldClass} />
        </Field>

        <Field id="symptoms" label="Symptoms (optional)">
          <textarea id="symptoms" name="symptoms" className={textareaClass} />
        </Field>

        {state.error && <Alert variant="error">{state.error}</Alert>}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Diagnosing…" : "Run troubleshooting"}
        </Button>
      </form>

      {state.result && <TroubleshootResultView result={state.result} similarIssues={state.similarIssues ?? []} />}
    </div>
  );
}
