"use client";

import { useActionState, useState } from "react";
import { DELIVERABLE_TYPES, type DeliverableType, type ServiceType } from "@/lib/domain/enums";
import {
  DELIVERABLE_LABELS,
  DELIVERABLE_REQUIRES_SERVICE,
  DELIVERABLE_CATEGORIES,
  DELIVERABLE_CATEGORY,
  DELIVERABLE_CATEGORY_LABELS,
  type DeliverableCategory,
} from "@/lib/domain/labels";
import {
  CoreDeliverableIcon,
  DesignDeliverableIcon,
  ProcessDeliverableIcon,
  ComplianceDeliverableIcon,
} from "@/components/icons";
import { generateDeliverablesAction, type GenerateFormState } from "./generate-actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { ComponentType, SVGProps } from "react";

const initialState: GenerateFormState = {};

const CATEGORY_ICONS: Record<DeliverableCategory, ComponentType<SVGProps<SVGSVGElement>>> = {
  core: CoreDeliverableIcon,
  design: DesignDeliverableIcon,
  process: ProcessDeliverableIcon,
  compliance: ComplianceDeliverableIcon,
};

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

  const [selected, setSelected] = useState<Set<DeliverableType>>(new Set(availableTypes));

  function toggle(type: DeliverableType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {selected.size} of {availableTypes.length} selected
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => setSelected(new Set(availableTypes))}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Select none
          </button>
        </div>
      </div>

      {DELIVERABLE_CATEGORIES.map((category) => {
        const typesInCategory = availableTypes.filter((type) => DELIVERABLE_CATEGORY[type] === category);
        if (typesInCategory.length === 0) return null;
        const CategoryIcon = CATEGORY_ICONS[category];

        return (
          <div key={category} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <CategoryIcon className="h-3.5 w-3.5" />
              {DELIVERABLE_CATEGORY_LABELS[category]}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {typesInCategory.map((type) => {
                const isChecked = selected.has(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isChecked ? "border-brand bg-brand-light" : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="deliverableTypes"
                      value={type}
                      checked={isChecked}
                      onChange={() => toggle(type)}
                      className="accent-brand"
                    />
                    {DELIVERABLE_LABELS[type]}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

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

      <Button type="submit" disabled={isPending || selected.size === 0} className="w-fit">
        {isPending ? "Generating… runs one at a time, longer with more selected" : "Generate deliverables"}
      </Button>
    </form>
  );
}
