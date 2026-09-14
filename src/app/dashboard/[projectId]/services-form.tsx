"use client";

import { useActionState } from "react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
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
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      {SERVICE_TYPES.map((service) => (
        <label key={service} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="services"
            value={service}
            defaultChecked={currentServices.includes(service)}
            className="accent-brand"
          />
          {SERVICE_LABELS[service]}
        </label>
      ))}

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      <div className="mt-2 flex items-center gap-3">
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
