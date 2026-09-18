import { z } from "zod";

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateOrganizationNameSchema = z.object({
  firmName: z
    .string()
    .trim()
    .min(1, "Organization name can't be empty")
    .max(100, "Keep it under 100 characters"),
});

export type UpdateOrganizationNameInput = z.infer<typeof updateOrganizationNameSchema>;
