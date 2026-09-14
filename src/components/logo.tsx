import Link from "next/link";

// Text-based mark rather than an image asset — no logo file exists yet,
// and a styled wordmark is a reasonable placeholder until Bravo supplies
// one. "Pilot" in the accent color nods at the product name without
// needing an icon.
export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground">
      Purview<span className="text-brand">Pilot</span>
    </Link>
  );
}
