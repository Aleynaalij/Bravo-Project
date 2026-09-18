import { TONE_FILL, type ChartTone } from "./tone";

// A single value-out-of-max progress bar — e.g. Security Score. Takes
// tone as a prop rather than computing its own threshold so the fill
// color always matches whatever Badge elsewhere on the same page already
// shows for the same number, one threshold definition, not two.
export function ScoreBar({ value, max = 100, tone }: { value: number; max?: number; tone: ChartTone }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className={`h-full rounded-full ${TONE_FILL[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
