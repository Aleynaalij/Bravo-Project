"use client";

import { useActionState } from "react";
import { DELIVERABLE_TYPES, type ServiceType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, DELIVERABLE_REQUIRES_SERVICE } from "@/lib/domain/labels";
import { generateDeliverablesAction, type GenerateFormState } from "./generate-actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: GenerateFormState = {};

export function GenerateForm({
  projectId,
  services,
}: {
  projectId: string;
  services: ServiceType[];
}) {
  const [state, formAction, isPending] = useActionState(generateDeliverablesAction, initialState);

  const availableTypes = DELIVERABLE_TYPES.filter((type) => {
    const requiredService = DELIVERABLE_REQUIRES_SERVICE[type];
    return !requiredService || services.includes(requiredService);
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {availableTypes.map((type) => (
          <label
            key={type}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-light"
          >
            <input
              type="checkbox"
              name="deliverableTypes"
              value={type}
              defaultChecked
              className="accent-brand"
            />
            {DELIVERABLE_LABELS[type]}
          </label>
        ))}
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {!isPending && state.completedAt && !state.failedResults && (
        <Alert variant="success">Generation complete.</Alert>
      )}
      {!isPending && state.failedResults && (
        <div className="flex flex-col gap-2 rounded-md border border-error-border bg-error-bg px-3 py-2">
          {state.failedResults.map((result) => (
            <div key={result.deliverableType} className="text-sm text-error-text">
              <span className="font-medium">{result.deliverableType} failed:</span>{" "}
              <span className="font-mono text-xs">{result.errorMessage}</span>
            </div>
          ))}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Generating… runs one at a time, longer with more selected" : "Generate deliverables"}
      </Button>
    </form>
  );
}
