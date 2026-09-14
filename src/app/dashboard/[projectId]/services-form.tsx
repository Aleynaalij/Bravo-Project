"use client";

import { useActionState } from "react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/domain/enums";
import {
  SERVICE_LABELS,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  SERVICE_PRACTICE_AREA,
} from "@/lib/domain/labels";
import { SERVICE_ICONS, PRACTICE_AREA_ICONS } from "@/components/icons";
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
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />

      {PRACTICE_AREAS.map((area) => {
        const servicesInArea = SERVICE_TYPES.filter((service) => SERVICE_PRACTICE_AREA[service] === area);
        if (servicesInArea.length === 0) return null;
        const AreaIcon = PRACTICE_AREA_ICONS[area];

        return (
          <div key={area} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <AreaIcon className="h-3.5 w-3.5" />
              {PRACTICE_AREA_LABELS[area]}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {servicesInArea.map((service) => {
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
          </div>
        );
      })}

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
