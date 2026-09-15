"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/auth/session";
import { upsertBranding } from "@/lib/branding";
import { brandingSchema } from "@/lib/validation/branding";

export interface BrandingFormState {
  error?: string;
  success?: boolean;
}

export async function updateBrandingAction(
  _prevState: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  const supabase = await createClient();
  const accountId = await requireAccountId(supabase);

  const parsed = brandingSchema.safeParse({
    firmNameOverride: String(formData.get("firmNameOverride") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  await upsertBranding(supabase, accountId, parsed.data);
  revalidatePath("/dashboard/branding");
  return { success: true };
}
