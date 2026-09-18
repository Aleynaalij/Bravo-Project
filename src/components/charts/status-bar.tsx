import { TONE_FILL, type ChartTone } from "./tone";

export interface StatusSegment {
  label: string;
  count: number;
  tone: ChartTone;
}

// A 100%-stacked single bar for a fixed, small set of status categories
// that together make up a whole (e.g. healthy/needs review/stalled) —
// segment width is each category's share of the total, with a 2px
// surface gap between fills. Identity is never color-alone: every
// segment is paired with a text-labeled legend entry below the bar.
export function StatusBar({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-hover">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <div
              key={segment.label}
              className={`h-full ${TONE_FILL[segment.tone]}`}
              style={{ width: `${(segment.count / total) * 100}%` }}
              title={`${segment.label}: ${segment.count}`}
            />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_FILL[segment.tone]}`} aria-hidden />
            <span className="text-muted">{segment.label}</span>
            <span className="font-medium tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
