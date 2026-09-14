import type { ReactNode } from "react";

export type AlertVariant = "info" | "success" | "error" | "warning";

const styles: Record<AlertVariant, string> = {
  info: "bg-info-bg text-info-text border-info-border",
  success: "bg-success-bg text-success-text border-success-border",
  error: "bg-error-bg text-error-text border-error-border",
  warning: "bg-warning-bg text-warning-text border-warning-border",
};

export function Alert({
  variant,
  children,
  className = "",
}: {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles[variant]} ${className}`}>{children}</div>
  );
}
