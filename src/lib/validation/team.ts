import { z } from "zod";

export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
