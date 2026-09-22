"use client";

import { useActionState } from "react";
import { SCRIPT_TYPES } from "@/lib/validation/vault";
import type { AuditFinding, AuditSeverity, CodeAuditResult } from "@/lib/validation/automation";
import { runCodeAuditAction, type AuditFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ScoreBar } from "@/components/charts/score-bar";
import type { ChartTone } from "@/components/charts/tone";

const initialState: AuditFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const codeClass = `${fieldClass} min-h-64 font-mono`;

const SCRIPT_TYPE_LABELS: Record<(typeof SCRIPT_TYPES)[number], string> = {
  powershell: "PowerShell",
  graph_api: "Graph API",
  kql: "KQL",
  json: "JSON",
  terraform: "Terraform",
  bicep: "Bicep",
  arm_template: "ARM Template",
};

const SEVERITY_TONE: Record<AuditSeverity, BadgeTone> = {
  info: "neutral",
  low: "brand",
  medium: "warning",
  high: "error",
  critical: "error",
};

const CATEGORY_LABELS: Record<keyof Pick<CodeAuditResult, "security" | "performance" | "maintainability" | "reliability" | "bestPractices">, string> = {
  security: "Security",
  performance: "Performance",
  maintainability: "Maintainability",
  reliability: "Reliability",
  bestPractices: "Best practices",
};

function scoreTone(value: number): ChartTone {
  return value >= 80 ? "success" : value >= 50 ? "warning" : "error";
}

function FindingList({ findings }: { findings: AuditFinding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-muted">Nothing flagged.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {findings.map((finding, i) => (
        <li key={i} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0">
          <div className="flex items-center gap-2">
            <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
            <span className="text-sm font-medium">{finding.title}</span>
          </div>
          <p className="text-sm text-muted">{finding.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function AuditResultView({ result }: { result: CodeAuditResult }) {
  const scoreEntries: [string, number][] = [
    ["Security", result.scoreCard.security],
    ["Performance", result.scoreCard.performance],
    ["Maintainability", result.scoreCard.maintainability],
    ["Documentation", result.scoreCard.documentation],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Overall score</h3>
          <Badge tone={scoreTone(result.scoreCard.overall)}>{result.scoreCard.overall}/100</Badge>
        </div>
        <ScoreBar value={result.scoreCard.overall} tone={scoreTone(result.scoreCard.overall)} />
        <div className="mt-2 flex flex-col gap-2">
          {scoreEntries.map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted">{label}</span>
              <ScoreBar value={value} tone={scoreTone(value)} />
              <span className="w-10 shrink-0 text-right text-xs text-muted">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="font-medium">{CATEGORY_LABELS[category]}</h3>
          <FindingList findings={result[category]} />
        </div>
      ))}
    </div>
  );
}

export function AuditForm() {
  const [state, formAction, isPending] = useActionState(runCodeAuditAction, initialState);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="scriptType">
            Language
          </label>
          <select id="scriptType" name="scriptType" required defaultValue="powershell" className={fieldClass}>
            {SCRIPT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SCRIPT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="code">
            Script to audit
          </label>
          <p className="text-xs text-muted">
            Graded against this account&apos;s own coding standard for the selected language, where one exists.
          </p>
          <textarea id="code" name="code" required className={codeClass} />
        </div>

        {state.error && <Alert variant="error">{state.error}</Alert>}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Auditing…" : "Run audit"}
        </Button>
      </form>

      {state.result && <AuditResultView result={state.result} />}
    </div>
  );
}
