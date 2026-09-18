import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableContent } from "@/lib/validation/deliverable";

export function extractDeliverableText(content: DeliverableContent): string {
  return content.sections.map((s) => s.paragraphs.join(" ")).join(" ");
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

// Sørensen–Dice coefficient over word multisets — a standard, symmetric
// text-similarity measure (2*|common| / (|A|+|B|)), not a fabricated
// score. Cheap (linear in word count via hashmaps), unlike a full edit-
// distance/diff algorithm, which this project doesn't need: the question
// here is "how much changed," not "where exactly." Returns 0 for
// identical text, up to 1 for completely disjoint text.
export function computeChangeRatio(originalText: string, editedText: string): number {
  const wordsA = tokenize(originalText);
  const wordsB = tokenize(editedText);
  if (wordsA.length === 0 && wordsB.length === 0) return 0;

  const countsA = new Map<string, number>();
  for (const word of wordsA) countsA.set(word, (countsA.get(word) ?? 0) + 1);

  let common = 0;
  const countsB = new Map<string, number>();
  for (const word of wordsB) countsB.set(word, (countsB.get(word) ?? 0) + 1);
  for (const [word, countB] of countsB) {
    const countA = countsA.get(word) ?? 0;
    common += Math.min(countA, countB);
  }

  const similarity = (2 * common) / (wordsA.length + wordsB.length);
  return 1 - similarity;
}

export type EditSeverity = "minor" | "major";

// Thresholds are a documented judgment call, not a certified quality
// bar — same "heuristic, not a black box" stance as Engagement Health
// (src/lib/metrics/engagement.ts). Under 15% of words changed reads as
// polish (a typo, a name, a number); at or above that, enough of the
// document changed that the AI draft wasn't the delivered content.
// Revisit these numbers once there's enough real edit history to see
// whether they actually separate "polish" from "rewrite" in practice.
const MAJOR_EDIT_THRESHOLD = 0.15;

export function classifyEditSeverity(changeRatio: number): EditSeverity {
  return changeRatio >= MAJOR_EDIT_THRESHOLD ? "major" : "minor";
}

export interface EditSeverityBreakdown {
  minorEdit: number;
  majorEdit: number;
}

// Only classifies deliverables that were actually edited (source =
// consultant_edited somewhere in their version history) into minor vs.
// major — pairs with src/lib/metrics/usage.ts's existing editRate, which
// already tracks edited-vs-not; this doesn't recompute that split, only
// subdivides the "edited" side of it. Compares the first version (the
// original AI draft) against the deliverable's current latest version,
// since that's what "how much did the final delivered content differ
// from the first draft" actually asks.
export async function getEditSeverityBreakdown(
  supabase: SupabaseClient,
): Promise<EditSeverityBreakdown> {
  const { data, error } = await supabase
    .from("deliverable_versions")
    .select("deliverable_id, version_number, source, content")
    .order("deliverable_id", { ascending: true })
    .order("version_number", { ascending: true });
  if (error) throw error;

  const versionsByDeliverable = new Map<
    string,
    { version_number: number; source: string; content: DeliverableContent }[]
  >();
  for (const row of data ?? []) {
    const list = versionsByDeliverable.get(row.deliverable_id) ?? [];
    list.push(row);
    versionsByDeliverable.set(row.deliverable_id, list);
  }

  const breakdown: EditSeverityBreakdown = { minorEdit: 0, majorEdit: 0 };

  for (const versions of versionsByDeliverable.values()) {
    const latest = versions[versions.length - 1];
    if (latest.source !== "consultant_edited") continue;

    const original = versions[0];
    const changeRatio = computeChangeRatio(
      extractDeliverableText(original.content),
      extractDeliverableText(latest.content),
    );
    const severity = classifyEditSeverity(changeRatio);
    if (severity === "major") breakdown.majorEdit += 1;
    else breakdown.minorEdit += 1;
  }

  return breakdown;
}
