// Shared status-tone fill map for chart marks — the same three-state
// vocabulary Badge already uses (success/warning/error), reused here
// rather than inventing a second color system. Status colors are
// reserved for genuine good/warning/critical state, never repurposed as
// a generic categorical series.
export type ChartTone = "success" | "warning" | "error";

export const TONE_FILL: Record<ChartTone, string> = {
  success: "bg-success-text",
  warning: "bg-warning-text",
  error: "bg-error-text",
};
