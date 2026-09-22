import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/ai/provider";
import type { VaultEntryRow } from "./entries-service";
import type { VaultScriptRow } from "./scripts-service";
import type { VaultEntryType, ScriptType } from "@/lib/validation/vault";

const SEMANTIC_MATCH_COUNT = 8;

export interface VaultSearchResult {
  entries: VaultEntryRow[];
  scripts: VaultScriptRow[];
}

// Pure filter used by the "what would [teammate] do?" control on both vault
// list pages — a generic filter-by-author, not tied to any one person.
// null (no filter selected) returns every row unchanged.
export function filterByAuthorId<T>(rows: T[], authorUserId: string | null, getAuthorId: (row: T) => string | null): T[] {
  if (!authorUserId) return rows;
  return rows.filter((row) => getAuthorId(row) === authorUserId);
}

// Pure text-match scoring used by the fallback paths below (no AI provider
// configured, or the embeddings call failed) — counts how many distinct
// query terms appear in a row's searchable text, drops rows matching none,
// and sorts most-matching first. Not real relevance ranking (that's what
// the embedding path is for) — just enough for "type a few words, get
// plausible results" to work without an AI provider, same spirit as
// src/lib/generation/knowledge-base.ts's tagFilteredSearch fallback.
export function rankByTextMatch<T>(rows: T[], query: string, getText: (row: T) => string): T[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;

  return rows
    .map((row) => {
      const text = getText(row).toLowerCase();
      const score = terms.filter((term) => text.includes(term)).length;
      return { row, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ row }) => row);
}

// Returns null (not an empty array) whenever it can't produce a real
// semantic result — same contract as knowledge-base.ts's trySemanticSearch
// — so the caller knows to fall back to text matching instead of treating
// "no AI provider configured" as "this account's vault is empty."
async function trySemanticSearchEntries(
  supabase: SupabaseClient,
  query: string,
  entryTypes?: VaultEntryType[],
): Promise<VaultEntryRow[] | null> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    return null;
  }

  const { data, error } = await supabase.rpc("match_knowledge_vault_entries", {
    query_embedding: queryEmbedding,
    filter_entry_types: entryTypes ?? null,
    match_count: SEMANTIC_MATCH_COUNT,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data as VaultEntryRow[];
}

async function trySemanticSearchScripts(
  supabase: SupabaseClient,
  query: string,
  scriptTypes?: ScriptType[],
): Promise<VaultScriptRow[] | null> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    return null;
  }

  const { data, error } = await supabase.rpc("match_knowledge_scripts", {
    query_embedding: queryEmbedding,
    filter_script_types: scriptTypes ?? null,
    match_count: SEMANTIC_MATCH_COUNT,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data as VaultScriptRow[];
}

async function textFilteredSearchEntries(
  supabase: SupabaseClient,
  query: string,
  entryTypes?: VaultEntryType[],
): Promise<VaultEntryRow[]> {
  let builder = supabase
    .from("knowledge_vault_entries")
    .select<
      string,
      VaultEntryRow
    >("id, account_id, entry_type, title, service_type, industry, project_id, author_user_id, author_email, environment, symptoms, root_cause, troubleshooting_steps, resolution, validation_steps, preventative_controls, lessons_learned, impact, severity, escalation_path, time_to_resolution_minutes, confidence_score, source_url, tags, version, created_at");
  if (entryTypes && entryTypes.length > 0) builder = builder.in("entry_type", entryTypes);

  const { data, error } = await builder;
  if (error) throw error;
  return rankByTextMatch(data ?? [], query, (entry) =>
    [entry.title, entry.symptoms, entry.root_cause, entry.resolution, entry.lessons_learned, ...entry.tags]
      .filter(Boolean)
      .join(" "),
  );
}

async function textFilteredSearchScripts(
  supabase: SupabaseClient,
  query: string,
  scriptTypes?: ScriptType[],
): Promise<VaultScriptRow[]> {
  let builder = supabase
    .from("knowledge_scripts")
    .select<
      string,
      VaultScriptRow
    >("id, account_id, name, description, script_type, service_type, content, risk_level, dependencies, validation_steps, rollback_steps, author_user_id, author_email, tags, version, created_at");
  if (scriptTypes && scriptTypes.length > 0) builder = builder.in("script_type", scriptTypes);

  const { data, error } = await builder;
  if (error) throw error;
  return rankByTextMatch(data ?? [], query, (script) =>
    [script.name, script.description, ...script.tags].filter(Boolean).join(" "),
  );
}

// Searches this account's own vault (RLS-scoped — never crosses accounts).
// Entries and scripts are returned as two separate ranked lists, not one
// blended list — Module 10's own principle is that real captured
// institutional knowledge outranks AI-generated content, and this MVP has
// no AI-generated-content tier at all yet, so there's nothing to blend
// against; keeping them separate also lets the UI show "N lessons/incidents
// · M scripts" rather than an arbitrary interleaving.
export async function searchVault(
  supabase: SupabaseClient,
  query: string,
  filters?: { entryTypes?: VaultEntryType[]; scriptTypes?: ScriptType[] },
): Promise<VaultSearchResult> {
  if (!query.trim()) return { entries: [], scripts: [] };

  const [semanticEntries, semanticScripts] = await Promise.all([
    trySemanticSearchEntries(supabase, query, filters?.entryTypes),
    trySemanticSearchScripts(supabase, query, filters?.scriptTypes),
  ]);

  const [entries, scripts] = await Promise.all([
    semanticEntries ?? textFilteredSearchEntries(supabase, query, filters?.entryTypes),
    semanticScripts ?? textFilteredSearchScripts(supabase, query, filters?.scriptTypes),
  ]);

  return { entries, scripts };
}
