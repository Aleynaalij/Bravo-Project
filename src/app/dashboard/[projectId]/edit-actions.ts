"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deliverableContentSchema } from "@/lib/validation/deliverable";
import { getDeliverableWithContent } from "@/lib/generation/deliverables";

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

  const supabase = await createClient();

  // The edit form has no diagram inputs (the diagram isn't inline-editable
  // yet — see docs/validation-checklist.md), so without this a save would
  // silently drop it from the new version. Carry the current version's
  // diagram forward unchanged, same as every other field this form doesn't
  // expose.
  const current = await getDeliverableWithContent(supabase, deliverableId);
  const diagram = current?.content?.diagram;

  const parsed = deliverableContentSchema.safeParse({ sections, ...(diagram ? { diagram } : {}) });
  if (!parsed.success) {
    return { error: "Every section needs a heading and at least one non-empty paragraph" };
  }

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

  // An edit invalidates whatever review state the previous content was
  // in — a stale approval must not carry over onto content nobody's
  // reviewed yet, so every field of the approval workflow (migration
  // 0044) resets here, not just review_status.
  const { error: updateError } = await supabase
    .from("deliverables")
    .update({
      current_version_id: version.id,
      review_status: "not_submitted",
      submitted_by: null,
      submitted_by_email: null,
      submitted_at: null,
      reviewed_by: null,
      reviewed_by_email: null,
      reviewed_at: null,
      review_note: null,
    })
    .eq("id", deliverableId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/dashboard/${projectId}`);
  return { savedAt: Date.now() };
}
