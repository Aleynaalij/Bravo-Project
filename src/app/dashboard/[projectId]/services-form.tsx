"use client";

import { useActionState } from "react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/domain/enums";
import { SERVICE_LABELS } from "@/lib/domain/labels";
import { updateServicesAction, type ServicesFormState } from "./actions";

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
          />
          {SERVICE_LABELS[service]}
        </label>
      ))}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save services"}
        </button>
        {!isPending && state.savedAt && (
          <span className="text-sm text-green-700">Saved</span>
        )}
      </div>
    </form>
  );
}
