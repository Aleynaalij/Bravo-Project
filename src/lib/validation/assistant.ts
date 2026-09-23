import { z } from "zod";

export const assistantChatRequestSchema = z.object({
  conversationId: z.string().uuid().nullable(),
  message: z.string().min(1).max(2000),
});
export type AssistantChatRequestInput = z.infer<typeof assistantChatRequestSchema>;

// What the model must return for an ordinary (non-generate) turn —
// intentionally just one field. Every other AI-generation feature in this
// app validates a much richer shape because it's producing a structured
// document; this one is producing a conversational answer, so the only
// thing worth Zod-enforcing is "a non-empty string came back."
export const assistantReplySchema = z.object({
  reply: z.string().min(1).max(4000),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;
