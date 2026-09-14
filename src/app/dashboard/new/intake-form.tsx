"use client";

import { useState } from "react";
import { SERVICE_TYPES } from "@/lib/domain/enums";
import { SERVICE_LABELS, INDUSTRY_OPTIONS, LICENSING_TIER_OPTIONS } from "@/lib/domain/labels";
import { createProjectAction } from "./actions";

export function IntakeForm() {
  const [industry, setIndustry] = useState("");
  const [licensingTier, setLicensingTier] = useState("");

  return (
    <form action={createProjectAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="customerName">
          Customer name
        </label>
        <input
          id="customerName"
          name="customerName"
          required
          className="rounded-md border px-3 py-2"
        />
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
          className="rounded-md border px-3 py-2"
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
            className="mt-2 rounded-md border px-3 py-2"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="userCount">
          User count
        </label>
        <input
          id="userCount"
          name="userCount"
          type="number"
          min={1}
          required
          className="rounded-md border px-3 py-2"
        />
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
          className="rounded-md border px-3 py-2"
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
            className="mt-2 rounded-md border px-3 py-2"
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
          className="rounded-md border px-3 py-2"
        />
        <span className="text-xs text-gray-500">Comma-separated</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="complianceNotes">
          Compliance notes
        </label>
        <textarea
          id="complianceNotes"
          name="complianceNotes"
          rows={3}
          placeholder="e.g. HIPAA, FedRAMP, GDPR requirements"
          className="rounded-md border px-3 py-2"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Services in scope</legend>
        {SERVICE_TYPES.map((service) => (
          <label key={service} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="services" value={service} />
            {SERVICE_LABELS[service]}
          </label>
        ))}
      </fieldset>

      <button type="submit" className="rounded-md bg-black px-4 py-2 text-white">
        Create project
      </button>
    </form>
  );
}
