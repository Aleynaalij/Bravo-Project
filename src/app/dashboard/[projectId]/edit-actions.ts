"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deliverableContentSchema } from "@/lib/validation/deliverable";

export interface EditFormState {
  error?: string;
  savedAt?: number;
}

// Saves a consultant's edits as a new deliverable_versions row (append-only
// history per PRD FR-6) rather than mutating the AI-generated version.
export async function saveEditedVersionAction(
  _prevState: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const projectId = String(formData.get("projectId") ?? "");
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const headings = formData.getAll("heading").map(String);
  const paragraphBlocks = formData.getAll("paragraphs").map(String);

  const sections = headings.map((heading, i) => ({
    heading,
    paragraphs: (paragraphBlocks[i] ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  }));

  const parsed = deliverableContentSchema.safeParse({ sections });
  if (!parsed.success) {
    return { error: "Every section needs a heading and at least one non-empty paragraph" };
  }

  const supabase = await createClient();

  const { data: nextVersionRow } = await supabase
    .from("deliverable_versions")
    .select("version_number")
    .eq("deliverable_id", deliverableId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersionNumber = (nextVersionRow?.version_number ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from("deliverable_versions")
    .insert({
      deliverable_id: deliverableId,
      version_number: nextVersionNumber,
      source: "consultant_edited",
      content: parsed.data,
    })
    .select("id")
    .single();
  if (versionError) return { error: versionError.message };

  const { error: updateError } = await supabase
    .from("deliverables")
    .update({ current_version_id: version.id })
    .eq("id", deliverableId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/dashboard/${projectId}`);
  return { savedAt: Date.now() };
}
