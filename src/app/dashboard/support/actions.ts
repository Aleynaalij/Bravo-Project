"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { submitSupportRequestSchema } from "@/lib/validation/support";
import { createSupportRequest } from "@/lib/support/service";

export interface SupportActionState {
  error?: string;
  success?: boolean;
}

export async function submitSupportRequestAction(
  _prevState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const parsed = submitSupportRequestSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) throw new UnauthorizedError();

    const accountId = await requireAccountId(supabase);
    await createSupportRequest(
      supabase,
      accountId,
      user.id,
      user.email,
      parsed.data.subject,
      parsed.data.message,
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  revalidatePath("/dashboard/support");
  return { success: true };
}
