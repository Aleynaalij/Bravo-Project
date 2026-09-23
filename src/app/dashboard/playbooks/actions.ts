"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { playbookInputSchema, buildPlaybookContent, PLAYBOOK_REQUIRED_HEADINGS } from "@/lib/validation/playbook";
import {
  createPlaybook,
  deletePlaybook,
  publishPlaybook,
  setPlaybookVaultEntryLinks,
  updatePlaybook,
} from "@/lib/playbook/service";
import { writeAuditLog } from "@/lib/audit/service";

export interface PlaybookFormState {
  error?: string;
}

function parseFormData(formData: FormData) {
  const paragraphsByHeading: Record<string, string> = {};
  for (const heading of PLAYBOOK_REQUIRED_HEADINGS) {
    paragraphsByHeading[heading] = String(formData.get(`section:${heading}`) ?? "");
  }
  const content = buildPlaybookContent(paragraphsByHeading);
  if (!content) {
    return { success: false as const, error: "Every section needs at least one non-empty paragraph." };
  }

  const serviceTypeRaw = String(formData.get("serviceType") ?? "");
  const parsed = playbookInputSchema.safeParse({
    playbookType: String(formData.get("playbookType") ?? ""),
    title: String(formData.get("title") ?? ""),
    serviceType: serviceTypeRaw || null,
    status: String(formData.get("status") ?? "draft"),
    content,
  });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the form for errors" };
  }
  const relatedVaultEntryIds = formData.getAll("relatedVaultEntryIds").map(String);
  return { success: true as const, data: parsed.data, relatedVaultEntryIds };
}

export async function createPlaybookAction(
  _prevState: PlaybookFormState,
  formData: FormData,
): Promise<PlaybookFormState> {
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

  const playbook = await createPlaybook(supabase, accountId, user.id, user.email, parsed.data);
  await setPlaybookVaultEntryLinks(supabase, playbook.id, parsed.relatedVaultEntryIds);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "playbook.create",
    target: playbook.id,
    metadata: { playbookType: playbook.playbook_type },
  });
  revalidatePath("/dashboard/playbooks");
  redirect(`/dashboard/playbooks/${playbook.id}`);
}

export async function updatePlaybookAction(
  _prevState: PlaybookFormState,
  formData: FormData,
): Promise<PlaybookFormState> {
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

  const playbook = await updatePlaybook(supabase, id, parsed.data);
  await setPlaybookVaultEntryLinks(supabase, playbook.id, parsed.relatedVaultEntryIds);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "playbook.update",
    target: playbook.id,
    metadata: { version: playbook.version },
  });
  revalidatePath("/dashboard/playbooks");
  redirect(`/dashboard/playbooks/${playbook.id}`);
}

export async function publishPlaybookAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  const playbook = await publishPlaybook(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "playbook.publish",
    target: playbook.id,
  });
  revalidatePath("/dashboard/playbooks");
  revalidatePath(`/dashboard/playbooks/${id}`);
}

export async function deletePlaybookAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const accountId = await requireAccountId(supabase);
  await deletePlaybook(supabase, id);
  await writeAuditLog(supabase, {
    accountId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "playbook.delete",
    target: id,
  });
  revalidatePath("/dashboard/playbooks");
  redirect("/dashboard/playbooks");
}
