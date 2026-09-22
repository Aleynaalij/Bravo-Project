"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { playbookGenerateRequestSchema } from "@/lib/validation/playbook";
import { generatePlaybook } from "@/lib/playbook/generate";
import { StructuredDocGenerationError } from "@/lib/generation/structured-doc";
import { writeAuditLog } from "@/lib/audit/service";

export interface GeneratePlaybookFormState {
  error?: string;
}

export async function generatePlaybookAction(
  _prevState: GeneratePlaybookFormState,
  formData: FormData,
): Promise<GeneratePlaybookFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const serviceTypeRaw = String(formData.get("serviceType") ?? "");
  const sourceProjectIdRaw = String(formData.get("sourceProjectId") ?? "");
  const parsed = playbookGenerateRequestSchema.safeParse({
    playbookType: String(formData.get("playbookType") ?? ""),
    title: String(formData.get("title") ?? ""),
    serviceType: serviceTypeRaw || null,
    context: String(formData.get("context") ?? ""),
    sourceProjectId: sourceProjectIdRaw || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  let playbook;
  try {
    playbook = await generatePlaybook(supabase, accountId, { id: user.id, email: user.email }, parsed.data);
  } catch (err) {
    if (err instanceof StructuredDocGenerationError) return { error: err.message };
    throw err;
  }

  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "playbook.generate",
    target: playbook.id,
    metadata: { playbookType: playbook.playbook_type },
  });
  revalidatePath("/dashboard/playbooks");
  redirect(`/dashboard/playbooks/${playbook.id}`);
}
