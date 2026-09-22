"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { sopInputSchema, buildSopContent, SOP_REQUIRED_HEADINGS } from "@/lib/validation/sop";
import { createSop, deleteSop, publishSop, updateSop } from "@/lib/sop/service";
import { writeAuditLog } from "@/lib/audit/service";

export interface SopFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  const paragraphsByHeading: Record<string, string> = {};
  for (const heading of SOP_REQUIRED_HEADINGS) {
    paragraphsByHeading[heading] = String(formData.get(`section:${heading}`) ?? "");
  }
  const content = buildSopContent(paragraphsByHeading);
  if (!content) {
    return { success: false as const, error: "Every section needs at least one non-empty paragraph." };
  }

  const serviceTypeRaw = String(formData.get("serviceType") ?? "");
  const parsed = sopInputSchema.safeParse({
    sopType: String(formData.get("sopType") ?? ""),
    title: String(formData.get("title") ?? ""),
    serviceType: serviceTypeRaw || null,
    status: String(formData.get("status") ?? "draft"),
    content,
  });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }
  return { success: true as const, data: parsed.data };
}

export async function createSopAction(_prevState: SopFormState, formData: FormData): Promise<SopFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const sop = await createSop(supabase, accountId, user.id, user.email, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "sop.create",
    target: sop.id,
    metadata: { sopType: sop.sop_type },
  });
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sop.id}`);
}

export async function updateSopAction(_prevState: SopFormState, formData: FormData): Promise<SopFormState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: parsed.error };

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }

  const sop = await updateSop(supabase, id, parsed.data);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "sop.update",
    target: sop.id,
    metadata: { version: sop.version },
  });
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sop.id}`);
}

export async function publishSopAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const sop = await publishSop(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "sop.publish",
    target: sop.id,
  });
  revalidatePath("/dashboard/sops");
  revalidatePath(`/dashboard/sops/${id}`);
}

export async function deleteSopAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deleteSop(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "sop.delete",
    target: id,
  });
  revalidatePath("/dashboard/sops");
  redirect("/dashboard/sops");
}
