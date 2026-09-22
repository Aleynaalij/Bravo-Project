import type { SupabaseClient } from "@supabase/supabase-js";
import { listVaultEntries } from "@/lib/vault/entries-service";
import { listVaultScripts } from "@/lib/vault/scripts-service";
import type { ServiceType } from "@/lib/domain/enums";

export interface VaultMetrics {
  totalEntries: number;
  totalScripts: number;
  counts: { lessonLearned: number; incident: number };
  entriesByService: { serviceType: ServiceType; count: number }[];
}

interface EntryLike {
  entry_type: "lesson_learned" | "incident";
  service_type: ServiceType | null;
}

// Pure aggregation — same documented-heuristic-free shape as the other
// account metrics on this page (usage.ts, engagement.ts): these are real
// counts of what the team has actually captured, not a scored signal, so
// there's no threshold to document here.
export function summarizeVaultMetrics(entries: EntryLike[], scriptCount: number): VaultMetrics {
  const counts = { lessonLearned: 0, incident: 0 };
  const byService = new Map<ServiceType, number>();

  for (const entry of entries) {
    if (entry.entry_type === "lesson_learned") counts.lessonLearned += 1;
    else counts.incident += 1;

    if (entry.service_type) byService.set(entry.service_type, (byService.get(entry.service_type) ?? 0) + 1);
  }

  const entriesByService = Array.from(byService.entries())
    .map(([serviceType, count]) => ({ serviceType, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEntries: entries.length,
    totalScripts: scriptCount,
    counts,
    entriesByService,
  };
}

export async function getVaultMetrics(supabase: SupabaseClient): Promise<VaultMetrics> {
  const [entries, scripts] = await Promise.all([listVaultEntries(supabase), listVaultScripts(supabase)]);
  return summarizeVaultMetrics(entries, scripts.length);
}
