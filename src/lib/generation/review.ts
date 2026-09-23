// The deliverable approval workflow — a second, independent lifecycle
// layered on top of a deliverable's existing generation `status` (pending/
// generating/ready/failed, migration 0001). This one tracks whether a
// *ready* deliverable has been reviewed before it goes to a client:
// not_submitted -> in_review -> approved | changes_requested, where
// changes_requested loops back to in_review once resubmitted. Flat RBAC
// (no dedicated "reviewer" role) means any teammate can submit, approve,
// or request changes, including the same person who submitted it — this
// app deliberately keeps permissions flat everywhere else, and a workflow
// gate is still real even without a role check enforcing who clicks it.
export const DELIVERABLE_REVIEW_STATUSES = ["not_submitted", "in_review", "approved", "changes_requested"] as const;
export type DeliverableReviewStatus = (typeof DELIVERABLE_REVIEW_STATUSES)[number];

export const DELIVERABLE_REVIEW_STATUS_LABELS: Record<DeliverableReviewStatus, string> = {
  not_submitted: "Draft",
  in_review: "In review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

// Pure and unit-tested independent of any Supabase call, same pattern as
// computeEngagementHealth/computeDeliveryRisk — a submit only makes sense
// once generation has actually produced content, and only from a state
// that isn't already mid-review.
export function canSubmitForReview(
  deliverableStatus: "pending" | "generating" | "ready" | "failed",
  reviewStatus: DeliverableReviewStatus,
): boolean {
  return deliverableStatus === "ready" && (reviewStatus === "not_submitted" || reviewStatus === "changes_requested");
}

export function canDecideReview(reviewStatus: DeliverableReviewStatus): boolean {
  return reviewStatus === "in_review";
}

// The export gate this workflow exists to enforce — only an approved
// deliverable is cleared to leave the system as a client-facing download.
export function canExportForClient(reviewStatus: DeliverableReviewStatus): boolean {
  return reviewStatus === "approved";
}
