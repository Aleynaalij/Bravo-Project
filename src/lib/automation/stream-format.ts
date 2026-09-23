import { generatedScriptSchema, type GeneratedScript } from "@/lib/validation/automation";

// Code Creator's streamed response can't be JSON — a viewer watching it
// arrive character-by-character would see escaped quotes/newlines, not
// real code. Instead the model is asked (see buildCreatorPrompt in
// creator.ts) to emit three sections back to back, marked off by these
// sentinels. Distinctive and unlikely to appear in real script/notes
// content by accident; if a script ever did emit one verbatim, the
// account's own coding standard/description would have had to ask for it.
export const SCRIPT_MARKER = "%%%QUEPILOT_SCRIPT%%%";
export const NOTES_MARKER = "%%%QUEPILOT_NOTES%%%";
export const ROLLBACK_MARKER = "%%%QUEPILOT_ROLLBACK%%%";

// The final, complete raw text once the stream has ended — strict about
// marker order and presence, since this result is what gets persisted to
// automation_requests.output. Returns null (not a throw) on malformed
// output so the caller can record a clean error_message instead of an
// unhandled exception.
export function parseStreamedScript(raw: string): GeneratedScript | null {
  const scriptIdx = raw.indexOf(SCRIPT_MARKER);
  const notesIdx = raw.indexOf(NOTES_MARKER);
  const rollbackIdx = raw.indexOf(ROLLBACK_MARKER);
  if (scriptIdx === -1 || notesIdx === -1 || rollbackIdx === -1) return null;
  if (!(scriptIdx < notesIdx && notesIdx < rollbackIdx)) return null;

  const candidate = {
    content: raw.slice(scriptIdx + SCRIPT_MARKER.length, notesIdx).trim(),
    notes: raw.slice(notesIdx + NOTES_MARKER.length, rollbackIdx).trim(),
    rollback: raw.slice(rollbackIdx + ROLLBACK_MARKER.length).trim(),
  };

  const validated = generatedScriptSchema.safeParse(candidate);
  return validated.success ? validated.data : null;
}

// Trims a trailing prefix of `marker` off the end of `text` — used so a
// marker that's arrived only partially (split across two stream chunks,
// which happens routinely since OpenAI/Azure stream a handful of
// characters per chunk) never flashes on screen before the rest of it
// lands and it gets cut for real. Only strips from the very end, and only
// an actual prefix of the marker, so ordinary text is never touched.
function stripTrailingPartialMarker(text: string, marker: string): string {
  const maxCheck = Math.min(marker.length - 1, text.length);
  for (let len = maxCheck; len > 0; len--) {
    if (text.endsWith(marker.slice(0, len))) return text.slice(0, -len);
  }
  return text;
}

// What the chalkboard should render *right now*, from however much raw
// text has streamed in so far — empty until the script section actually
// starts (the model may emit a little preamble before the first marker),
// and cut off the instant NOTES_MARKER appears, complete or not.
export function extractStreamingScriptPreview(rawSoFar: string): string {
  const scriptIdx = rawSoFar.indexOf(SCRIPT_MARKER);
  if (scriptIdx === -1) return "";

  const afterScript = rawSoFar.slice(scriptIdx + SCRIPT_MARKER.length);
  const notesIdx = afterScript.indexOf(NOTES_MARKER);
  const visible = notesIdx === -1 ? afterScript : afterScript.slice(0, notesIdx);

  return notesIdx === -1 ? stripTrailingPartialMarker(visible, NOTES_MARKER) : visible;
}
