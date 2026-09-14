import { z } from "zod";
import { DELIVERABLE_TYPES } from "@/lib/domain/enums";

// Structured section content every deliverable version must conform to
// (TDD §2.6) — keeps AI output formatted consistently instead of free-form
// prose. Validated before a deliverable_versions row is written.
export const deliverableSectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});

export const deliverableContentSchema = z.object({
  sections: z.array(deliverableSectionSchema).min(1),
});

export type DeliverableContent = z.infer<typeof deliverableContentSchema>;

export const generateRequestSchema = z.object({
  deliverableTypes: z.array(z.enum(DELIVERABLE_TYPES)).min(1),
});

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;

export const deliverableVersionCreateSchema = z.object({
  content: deliverableContentSchema,
});

export type DeliverableVersionCreateInput = z.infer<
  typeof deliverableVersionCreateSchema
>;
