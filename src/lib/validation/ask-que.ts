import { z } from "zod";

export const askQueRequestSchema = z.object({
  question: z.string().min(1).max(2000),
});
export type AskQueRequestInput = z.infer<typeof askQueRequestSchema>;

// What the model must return — intentionally just one field, same
// judgment call as every other free-text-answer shape in this app:
// there's nothing else worth Zod-enforcing beyond "a non-empty string
// came back," unlike a structured-document generation response.
export const askQueReplySchema = z.object({
  reply: z.string().min(1).max(4000),
});
export type AskQueReply = z.infer<typeof askQueReplySchema>;

export const generateSopFromAskQueRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  reply: z.string().min(1).max(4000),
});
export type GenerateSopFromAskQueRequestInput = z.infer<typeof generateSopFromAskQueRequestSchema>;
