import type { SupabaseClient } from "@supabase/supabase-js";

export interface BrandingInfo {
  logoUrl: string | null;
  primaryColor: string | null;
  firmNameOverride: string | null;
}

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

export async function upsertBranding(
  supabase: SupabaseClient,
  accountId: string,
  branding: BrandingInfo,
): Promise<void> {
  const { error } = await supabase.from("branding").upsert({
    account_id: accountId,
    logo_url: branding.logoUrl,
    primary_color: branding.primaryColor,
    firm_name_override: branding.firmNameOverride,
  });

  if (error) throw error;
}

// branding.primary_color is stored as a free-form "#rrggbb" string (or
// null); this is the one place that turns it into a value each export
// builder can trust, falling back to the app's own --brand from
// globals.css so an unset color still looks intentional rather than
// defaulting to plain black.
const DEFAULT_ACCENT_COLOR = "0F6CBD";

export function resolveAccentColor(primaryColor: string | null | undefined): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(primaryColor?.trim() ?? "");
  return match ? match[1].toUpperCase() : DEFAULT_ACCENT_COLOR;
}
