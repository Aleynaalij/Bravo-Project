import { z } from "zod";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const brandingSchema = z.object({
  firmNameOverride: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  logoUrl: z.preprocess(
    emptyToNull,
    z
      .string()
      .url()
      .refine((v) => v.startsWith("https://"), "Logo URL must start with https://")
      .nullable(),
  ),
  primaryColor: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #0F6CBD")
      .nullable(),
  ),
});

export type BrandingInput = z.infer<typeof brandingSchema>;
