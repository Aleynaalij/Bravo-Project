import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";

// Matches ProjectCreate/ProjectUpdate in docs/openapi.yaml.
export const projectCreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  userCount: z.number().int().positive(),
  licensingTier: z.string().min(1).max(100),
  geographicLocations: z.array(z.string()).default([]),
  complianceNotes: z.string().max(4000).nullable().optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectServicesSchema = z.object({
  services: z.array(z.enum(SERVICE_TYPES)).min(1),
});

export type ProjectServicesInput = z.infer<typeof projectServicesSchema>;
