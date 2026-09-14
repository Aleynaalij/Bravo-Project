import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-hover",
  danger: "text-error-text hover:bg-error-bg",
  ghost: "text-brand hover:underline underline-offset-2",
};

// Exposed for cases that can't use <Button>/<LinkButton> directly — e.g. a
// plain <a> to a file-download API route, where Next's <Link> would
// prefetch a response we don't want prefetched.
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "sm") {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
}) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
}
