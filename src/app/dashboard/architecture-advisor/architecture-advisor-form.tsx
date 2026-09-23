"use client";

import { useActionState } from "react";
import type { ArchitectureAdvisorResult } from "@/lib/validation/architecture-advisor";
import { runArchitectureAdvisorAction, type ArchitectureAdvisorFormState } from "./actions";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import type { ProjectRow } from "@/lib/projects/service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArchitectureDiagramView } from "@/components/architecture-diagram";

const initialState: ArchitectureAdvisorFormState = {};

const fieldClass = "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const textareaClass = `${fieldClass} min-h-24`;

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

function ArchitectureAdvisorResultView({ result }: { result: ArchitectureAdvisorResult }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Recommended services</h3>
        <div className="flex flex-wrap gap-2">
          {result.recommendedServices.map((s) => (
            <Badge key={s} tone="brand">
              {SERVICE_LABELS[s]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{result.diagram.title || "Architecture Diagram"}</h3>
        <ArchitectureDiagramView diagram={result.diagram} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Deployment roadmap</h3>
        <ul className="flex flex-col gap-2">
          {result.deploymentRoadmap.map((phase, i) => (
            <li key={i} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="text-sm font-medium">{phase.phase}</span>
              <p className="text-sm text-muted">{phase.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Implementation sequence</h3>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {result.implementationSequence.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {result.risks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Risks</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.risks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {result.dependencies.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Dependencies</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.dependencies.map((dep, i) => (
              <li key={i}>{dep}</li>
            ))}
          </ul>
        </div>
      )}

      {result.licensingRequirements.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Licensing requirements</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.licensingRequirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {result.operationalConsiderations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Operational considerations</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {result.operationalConsiderations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ArchitectureAdvisorForm({ project }: { project: ProjectRow | null }) {
  const [state, formAction, isPending] = useActionState(runArchitectureAdvisorAction, initialState);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-6">
        {project && <input type="hidden" name="projectId" value={project.id} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="industry" label="Industry">
            <input id="industry" name="industry" required defaultValue={project?.industry ?? ""} className={fieldClass} />
          </Field>

          <Field id="userCount" label="User count">
            <input
              id="userCount"
              name="userCount"
              type="number"
              min={1}
              required
              defaultValue={project?.user_count ?? ""}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field id="licensingTier" label="Licensing tier">
          <input
            id="licensingTier"
            name="licensingTier"
            required
            defaultValue={project?.licensing_tier ?? ""}
            className={fieldClass}
          />
        </Field>

        <Field id="complianceRequirements" label="Compliance requirements (optional)">
          <textarea
            id="complianceRequirements"
            name="complianceRequirements"
            defaultValue={project?.compliance_notes ?? ""}
            className={textareaClass}
          />
        </Field>

        <Field id="securityRequirements" label="Security requirements (optional)">
          <textarea id="securityRequirements" name="securityRequirements" className={textareaClass} />
        </Field>

        <Field id="businessGoals" label="Business goals (optional)">
          <textarea id="businessGoals" name="businessGoals" className={textareaClass} />
        </Field>

        {state.error && <Alert variant="error">{state.error}</Alert>}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Designing…" : "Propose architecture"}
        </Button>
      </form>

      {state.result && <ArchitectureAdvisorResultView result={state.result} />}
    </div>
  );
}
