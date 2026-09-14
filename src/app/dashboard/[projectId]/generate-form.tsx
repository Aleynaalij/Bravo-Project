"use client";

import { useActionState } from "react";
import { DELIVERABLE_TYPES } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import { generateDeliverablesAction, type GenerateFormState } from "./generate-actions";

const initialState: GenerateFormState = {};

export function GenerateForm({ projectId }: { projectId: string }) {
  const [state, formAction, isPending] = useActionState(generateDeliverablesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      {DELIVERABLE_TYPES.map((type) => (
        <label key={type} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="deliverableTypes" value={type} defaultChecked />
          {DELIVERABLE_LABELS[type]}
        </label>
      ))}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {!isPending && state.completedAt && !state.failedResults && (
        <p className="text-sm text-green-700">Generation complete.</p>
      )}
      {!isPending && state.failedResults && (
        <div className="flex flex-col gap-2 rounded-md bg-red-50 px-3 py-2">
          {state.failedResults.map((result) => (
            <div key={result.deliverableType} className="text-sm text-red-800">
              <span className="font-medium">{result.deliverableType} failed:</span>{" "}
              <span className="font-mono text-xs">{result.errorMessage}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-fit rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {isPending ? "Generating… this can take up to a minute" : "Generate deliverables"}
      </button>
    </form>
  );
}
