import type { SupabaseClient } from "@supabase/supabase-js";

export interface BrandingInfo {
  logoUrl: string | null;
  primaryColor: string | null;
  firmNameOverride: string | null;
}

// No branding settings UI exists yet, so this returns null for every
// account today — reading it here now means export doesn't need to change
// once that UI ships.
export async function getBranding(
  supabase: SupabaseClient,
  accountId: string,
): Promise<BrandingInfo | null> {
  const { data, error } = await supabase
    .from("branding")
    .select("logo_url, primary_color, firm_name_override")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    firmNameOverride: data.firm_name_override,
  };
}
