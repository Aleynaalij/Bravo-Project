import { z } from "zod";

export const submitSupportRequestSchema = z.object({
  subject: z.string().trim().min(1, "Enter a subject").max(200, "Keep the subject under 200 characters"),
  message: z
    .string()
    .trim()
    .min(1, "Enter a message")
    .max(4000, "Keep the message under 4,000 characters"),
});

export type SubmitSupportRequestInput = z.infer<typeof submitSupportRequestSchema>;
