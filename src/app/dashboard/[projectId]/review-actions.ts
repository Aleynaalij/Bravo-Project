"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/service";
import { getDeliverableWithContent } from "@/lib/generation/deliverables";
import { canSubmitForReview, canDecideReview } from "@/lib/generation/review";

export interface ReviewActionState {
  error?: string;
}

async function requireUserAndAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ userId: string; userEmail: string; accountId: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be signed in to do this." };

  try {
    const accountId = await requireAccountId(supabase);
    return { userId: user.id, userEmail: user.email, accountId };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "You need to be signed in to do this." };
    throw err;
  }
}

// Moves a ready deliverable into review — the first step of the approval
// workflow. Flat RBAC means no "reviewer" role exists to assign this to;
// any teammate submits, any teammate (including the same person) decides.
export async function submitForReviewAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const deliverableId = String(formData.get("deliverableId") ?? "");

  const supabase = await createClient();
  const auth = await requireUserAndAccount(supabase);
  if ("error" in auth) return auth;

  const deliverable = await getDeliverableWithContent(supabase, deliverableId);
  if (!deliverable) return { error: "Deliverable not found." };
  if (!canSubmitForReview(deliverable.status, deliverable.reviewStatus)) {
    return { error: "This deliverable can't be submitted for review right now." };
  }

  const { error } = await supabase
    .from("deliverables")
    .update({
      review_status: "in_review",
      submitted_by: auth.userId,
      submitted_by_email: auth.userEmail,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", deliverableId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    accountId: auth.accountId,
    actorUserId: auth.userId,
    actorEmail: auth.userEmail,
    action: "deliverable.review.submit",
    target: deliverableId,
  });
  revalidatePath(`/dashboard/${projectId}`);
  return {};
}

// Clears a deliverable for client-facing export — see canExportForClient()
// in src/lib/generation/review.ts, which the export route gates on this
// same review_status.
export async function approveDeliverableAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const deliverableId = String(formData.get("deliverableId") ?? "");

  const supabase = await createClient();
  const auth = await requireUserAndAccount(supabase);
  if ("error" in auth) return auth;

  const deliverable = await getDeliverableWithContent(supabase, deliverableId);
  if (!deliverable) return { error: "Deliverable not found." };
  if (!canDecideReview(deliverable.reviewStatus)) {
    return { error: "This deliverable isn't awaiting a review decision." };
  }

  const { error } = await supabase
    .from("deliverables")
    .update({
      review_status: "approved",
      reviewed_by: auth.userId,
      reviewed_by_email: auth.userEmail,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", deliverableId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    accountId: auth.accountId,
    actorUserId: auth.userId,
    actorEmail: auth.userEmail,
    action: "deliverable.review.approve",
    target: deliverableId,
  });
  revalidatePath(`/dashboard/${projectId}`);
  return {};
}

// The note is optional but strongly encouraged by the form's own copy —
// "changes requested" with no explanation isn't actionable, but this
// mirrors the rest of this app's narrative fields (no forced-required
// text field for something a person might reasonably leave blank once and
// explain out of band).
export async function requestChangesAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();

  const supabase = await createClient();
  const auth = await requireUserAndAccount(supabase);
  if ("error" in auth) return auth;

  const deliverable = await getDeliverableWithContent(supabase, deliverableId);
  if (!deliverable) return { error: "Deliverable not found." };
  if (!canDecideReview(deliverable.reviewStatus)) {
    return { error: "This deliverable isn't awaiting a review decision." };
  }

  const { error } = await supabase
    .from("deliverables")
    .update({
      review_status: "changes_requested",
      reviewed_by: auth.userId,
      reviewed_by_email: auth.userEmail,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq("id", deliverableId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    accountId: auth.accountId,
    actorUserId: auth.userId,
    actorEmail: auth.userEmail,
    action: "deliverable.review.request_changes",
    target: deliverableId,
    metadata: note ? { note } : undefined,
  });
  revalidatePath(`/dashboard/${projectId}`);
  return {};
}
