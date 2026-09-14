import { z } from "zod";
import { SERVICE_TYPES } from "@/lib/domain/enums";

export const knowledgeBaseEntrySchema = z.object({
  title: z.string().min(1).max(200),
  serviceType: z.enum(SERVICE_TYPES),
  industry: z.string().max(100).nullable(),
  content: z.string().min(1).max(4000),
  sourceUrl: z.string().url().nullable().or(z.literal("")).transform((v) => v || null),
});

export type KnowledgeBaseEntryInput = z.infer<typeof knowledgeBaseEntrySchema>;
