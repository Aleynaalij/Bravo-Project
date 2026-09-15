"use client";

import { useActionState } from "react";
import type { BrandingInfo } from "@/lib/branding";
import { updateBrandingAction, type BrandingFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: BrandingFormState = {};

const fieldClass =
  "rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function BrandingForm({ branding }: { branding: BrandingInfo | null }) {
  const [state, formAction, isPending] = useActionState(updateBrandingAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="firmNameOverride">
          Firm name
        </label>
        <p className="text-xs text-muted">
          Shown on exported deliverables instead of the default title. Leave blank to omit it.
        </p>
        <input
          id="firmNameOverride"
          name="firmNameOverride"
          defaultValue={branding?.firmNameOverride ?? ""}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="logoUrl">
          Logo URL
        </label>
        <p className="text-xs text-muted">
          A public HTTPS link to a PNG or JPEG image, embedded at the top of every export.
        </p>
        <input
          id="logoUrl"
          name="logoUrl"
          type="url"
          placeholder="https://example.com/logo.png"
          defaultValue={branding?.logoUrl ?? ""}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="primaryColor">
          Accent color
        </label>
        <p className="text-xs text-muted">
          Used for titles and section headings across DOCX, PDF, and PPTX exports.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Pick accent color"
            defaultValue={branding?.primaryColor ?? "#0F6CBD"}
            onChange={(e) => {
              const text = document.getElementById("primaryColor") as HTMLInputElement | null;
              if (text) text.value = e.target.value.toUpperCase();
            }}
            className="h-9 w-9 shrink-0 rounded-md border border-border p-0.5"
          />
          <input
            id="primaryColor"
            name="primaryColor"
            placeholder="#0F6CBD"
            defaultValue={branding?.primaryColor ?? ""}
            className={`${fieldClass} flex-1`}
          />
        </div>
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">Branding saved.</Alert>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
