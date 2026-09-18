import type { ReactNode } from "react";

export interface BarChartRow {
  label: string;
  value: number;
  // Rendered on the right in place of the raw number — e.g. a pair of
  // succeeded/failed badges — while the bar's width still encodes value
  // (total volume) so the row keeps a real magnitude comparison even
  // when its number is broken down elsewhere.
  annotation?: ReactNode;
}

// A ranked horizontal bar list for comparing magnitude across a set of
// named categories — one sequential hue (brand), width proportional to
// the largest value in the set, per row a real label rather than a
// legend lookup. Not for a fixed set of status categories that should
// read as parts of a whole — see StatusBar for that.
export function BarChart({ rows }: { rows: BarChartRow[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => {
        // A real but nonzero value still reads as a visible sliver rather
        // than vanishing next to a much larger bar in the same list.
        const pct = row.value > 0 ? Math.max((row.value / max) * 100, 3) : 0;
        return (
          <li key={row.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted">{row.annotation ?? row.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
