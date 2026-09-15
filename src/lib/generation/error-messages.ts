// Maps the raw error strings jobs.ts stores in generation_jobs.error_message
// to something a consultant can actually act on. The raw message ranges
// from our own GenerationError text (src/lib/generation/run.ts) to a bare
// Postgres or AI-provider SDK exception — none of it is something an end
// user should have to parse. String-matching on known prefixes rather than
// a dedicated error-code column: cheap, and every message we control is
// stable text we wrote ourselves in run.ts.
interface KnownPattern {
  match: (message: string) => boolean;
  friendly: string;
}

const KNOWN_PATTERNS: KnownPattern[] = [
  {
    match: (m) => m.startsWith("No active prompt template for"),
    friendly:
      "This deliverable type isn't available yet — it hasn't been fully set up on the platform. Try a different type, or contact support.",
  },
  {
    match: (m) => m === "Select at least one service in scope before generating",
    friendly: "Add at least one service to this project's scope, then try generating again.",
  },
  {
    match: (m) => m === "Project not found",
    friendly: "This project couldn't be found — it may have been deleted.",
  },
  {
    match: (m) =>
      m.includes("AI response was not valid JSON") ||
      m.includes("AI response did not match the expected section schema") ||
      m.includes("AI response used different sections than requested"),
    friendly: "The AI draft came back in an unexpected format. This is usually temporary — try generating again.",
  },
];

const DEFAULT_FRIENDLY_MESSAGE =
  "Generation didn't complete successfully. Try again — if it keeps happening, contact support.";

export function getFriendlyGenerationError(rawMessage: string | null): string {
  if (!rawMessage) return DEFAULT_FRIENDLY_MESSAGE;
  return KNOWN_PATTERNS.find((pattern) => pattern.match(rawMessage))?.friendly ?? DEFAULT_FRIENDLY_MESSAGE;
}
