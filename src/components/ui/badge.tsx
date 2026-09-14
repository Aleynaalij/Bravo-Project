import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "success" | "error" | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-hover text-muted border-border",
  brand: "bg-brand-light text-brand-dark border-brand-light",
  success: "bg-success-bg text-success-text border-success-border",
  error: "bg-error-bg text-error-text border-error-border",
  warning: "bg-warning-bg text-warning-text border-warning-border",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
