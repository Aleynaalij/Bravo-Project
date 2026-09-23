import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Microsoft's own official, unauthenticated MCP (Model Context Protocol)
// server for Microsoft Docs/Learn content — https://learn.microsoft.com/api/mcp,
// tool: microsoft_docs_search. This is the real, sanctioned public
// interface Microsoft provides for exactly this purpose, not a fabricated
// live-fetch stand-in — see docs/TDD.md's Module 10 entry for how this
// was scoped. It speaks MCP (JSON-RPC over Streamable HTTP), not a plain
// REST endpoint, hence the @modelcontextprotocol/sdk dependency.
const MCP_ENDPOINT = "https://learn.microsoft.com/api/mcp";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_SNIPPET_LENGTH = 240;

export interface MicrosoftDocResult {
  title: string;
  url: string;
  snippet: string;
}

// Live and real, but genuinely unverified — this sandbox's network egress
// blocks learn.microsoft.com, so this has never actually round-tripped a
// request. Returns null (never throws) on any failure — connect, call,
// timeout, or a response shape parseMicrosoftDocsSearchResult doesn't
// recognize — same "can't produce a real result, let the caller fall
// back" contract as trySemanticSearchEntries/trySemanticSearchScripts in
// src/lib/vault/search.ts. A fresh client + transport per call, closed in
// a finally: this runs inside a Vercel serverless function invocation,
// not a long-lived process, so there's no connection worth pooling.
export async function searchMicrosoftDocs(query: string): Promise<MicrosoftDocResult[] | null> {
  if (!query.trim()) return [];

  const client = new Client({ name: "quepilot", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT));

  try {
    await client.connect(transport, { timeout: REQUEST_TIMEOUT_MS });
    const result = await client.callTool(
      { name: "microsoft_docs_search", arguments: { query } },
      undefined,
      { timeout: REQUEST_TIMEOUT_MS },
    );
    return parseMicrosoftDocsSearchResult(result);
  } catch {
    return null;
  } finally {
    await client.close().catch(() => {});
  }
}

// The exact shape of microsoft_docs_search's response isn't something
// this session could confirm live (see searchMicrosoftDocs's doc
// comment), so this handles the two most likely shapes defensively
// rather than assuming one: a structured JSON result (if the tool
// declares an outputSchema) or MCP's near-universal fallback for a
// search-style tool, markdown-formatted text content with [title](url)
// links. Anything else — or either shape yielding nothing recognizable —
// returns [] (a valid "no results" outcome), never a guess.
export function parseMicrosoftDocsSearchResult(result: unknown): MicrosoftDocResult[] {
  if (!result || typeof result !== "object") return [];

  const structured = fromStructuredContent((result as { structuredContent?: unknown }).structuredContent);
  if (structured.length > 0) return structured;

  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return [];

  const text = content
    .filter((item): item is { type: "text"; text: string } => {
      return typeof item === "object" && item !== null && (item as { type?: unknown }).type === "text";
    })
    .map((item) => item.text)
    .join("\n\n");

  return fromMarkdownLinks(text);
}

function fromStructuredContent(structuredContent: unknown): MicrosoftDocResult[] {
  if (!structuredContent || typeof structuredContent !== "object") return [];

  // Try every plausible array-valued key a search-results object might
  // use rather than committing to one guessed field name.
  const candidateArrays = Object.values(structuredContent as Record<string, unknown>).filter(Array.isArray);

  for (const array of candidateArrays) {
    const results = array
      .map((entry) => normalizeStructuredEntry(entry))
      .filter((entry): entry is MicrosoftDocResult => entry !== null);
    if (results.length > 0) return results;
  }
  return [];
}

function normalizeStructuredEntry(entry: unknown): MicrosoftDocResult | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;

  const title = firstString(row.title, row.name, row.heading);
  const url = firstString(row.url, row.link, row.contentUrl, row.href);
  if (!title || !url) return null;

  const snippet = firstString(row.snippet, row.description, row.excerpt, row.content, row.summary) ?? "";
  return { title, url, snippet: truncate(snippet) };
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function fromMarkdownLinks(text: string): MicrosoftDocResult[] {
  const results: MicrosoftDocResult[] = [];
  const matches = Array.from(text.matchAll(MARKDOWN_LINK_PATTERN));

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const url = match[2].trim();
    if (!title || !url) continue;

    // The snippet is whatever text falls between this link and the next
    // one (or the end of the text) — the closest thing to "the paragraph
    // that follows this result" without assuming a stricter format.
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const snippet = text.slice(start, end).trim();

    results.push({ title, url, snippet: truncate(snippet) });
  }
  return results;
}

function truncate(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;
  return `${text.slice(0, MAX_SNIPPET_LENGTH).trimEnd()}…`;
}
