"use client";

import { useActionState } from "react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { SERVICE_ICONS } from "@/components/icons";
import { updateServicesAction, type ServicesFormState } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: ServicesFormState = {};

export function ServicesForm({
  projectId,
  currentServices,
}: {
  projectId: string;
  currentServices: ServiceType[];
}) {
  const [state, formAction, isPending] = useActionState(updateServicesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SERVICE_TYPES.map((service) => {
          const Icon = SERVICE_ICONS[service];
          return (
            <label
              key={service}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-light hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                name="services"
                value={service}
                defaultChecked={currentServices.includes(service)}
                className="accent-brand"
              />
              <Icon className="h-4 w-4 shrink-0 text-brand-dark" />
              {SERVICE_LABELS[service]}
            </label>
          );
        })}
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending} className="w-fit">
          {isPending ? "Saving…" : "Save services"}
        </Button>
        {!isPending && state.savedAt && (
          <span className="text-sm text-success-text">Saved</span>
        )}
      </div>
    </form>
  );
}
