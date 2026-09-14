"use client";

import { useActionState, useState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS, INDUSTRY_OPTIONS, LICENSING_TIER_OPTIONS } from "@/lib/domain/labels";
import { createProjectAction, type IntakeFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SERVICE_ICONS } from "@/components/icons";

const initialState: IntakeFormState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function IntakeForm() {
  const [industry, setIndustry] = useState("");
  const [licensingTier, setLicensingTier] = useState("");
  const [state, formAction, isPending] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="customerName">
          Customer name
        </label>
        <input id="customerName" name="customerName" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="industry">
          Industry
        </label>
        <select
          id="industry"
          name="industry"
          required
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Select an industry
          </option>
          {INDUSTRY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {industry === "Other" && (
          <input
            name="industryOther"
            placeholder="Enter industry"
            required
            className={`mt-2 ${fieldClass}`}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="userCount">
          User count
        </label>
        <input id="userCount" name="userCount" type="number" min={1} required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="licensingTier">
          Licensing
        </label>
        <select
          id="licensingTier"
          name="licensingTier"
          required
          value={licensingTier}
          onChange={(e) => setLicensingTier(e.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Select a licensing tier
          </option>
          {LICENSING_TIER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {licensingTier === "Other" && (
          <input
            name="licensingTierOther"
            placeholder="Enter licensing tier"
            required
            className={`mt-2 ${fieldClass}`}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="geographicLocations">
          Geographic locations
        </label>
        <input
          id="geographicLocations"
          name="geographicLocations"
          placeholder="e.g. United States, Canada"
          className={fieldClass}
        />
        <span className="text-xs text-muted">Comma-separated</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="complianceNotes">
          Compliance notes
        </label>
        <textarea
          id="complianceNotes"
          name="complianceNotes"
          rows={3}
          placeholder="e.g. HIPAA, FedRAMP, NIST 800-53, CMMC, GDPR requirements"
          className={fieldClass}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Services in scope</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICE_TYPES.map((service) => {
            const Icon = SERVICE_ICONS[service];
            return (
              <label
                key={service}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-light hover:bg-surface-hover"
              >
                <input type="checkbox" name="services" value={service} className="accent-brand" />
                <Icon className="h-4 w-4 shrink-0 text-brand-dark" />
                {SERVICE_LABELS[service]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
