import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
}

// Server-renderable via `?tab=` searchParams — no client state, same
// pattern as settings/page.tsx's and knowledge-vault/page.tsx's own
// searchParams-driven filters, just applied to a full-width tab row
// instead of a filter control. The caller decides what's active by
// reading searchParams itself and renders content conditionally; this
// component only draws the row and the links. "overview" (the default
// tab) omits `?tab=` entirely so the bare page URL still works.
export function Tabs({ items, active, basePath }: { items: TabItem[]; active: string; basePath: string }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border" role="tablist">
      {items.map((item) => {
        const isActive = item.key === active;
        const href = item.key === "overview" ? basePath : `${basePath}?tab=${item.key}`;
        return (
          <Link
            key={item.key}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
