"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { sopGenerateRequestSchema } from "@/lib/validation/sop";
import { generateSop } from "@/lib/sop/generate";
import { StructuredDocGenerationError } from "@/lib/generation/structured-doc";
import { writeAuditLog } from "@/lib/audit/service";

export interface GenerateSopFormState {
  error?: string;
}

export async function generateSopAction(
  _prevState: GenerateSopFormState,
  formData: FormData,
): Promise<GenerateSopFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const serviceTypeRaw = String(formData.get("serviceType") ?? "");
  const sourceProjectIdRaw = String(formData.get("sourceProjectId") ?? "");
  const parsed = sopGenerateRequestSchema.safeParse({
    sopType: String(formData.get("sopType") ?? ""),
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

  let sop;
  try {
    sop = await generateSop(supabase, accountId, { id: user.id, email: user.email }, parsed.data);
  } catch (err) {
    if (err instanceof StructuredDocGenerationError) return { error: err.message };
    throw err;
  }

  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "sop.generate",
    target: sop.id,
    metadata: { sopType: sop.sop_type },
  });
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sop.id}`);
}
