// In-memory sliding-window limiter for edge middleware (src/proxy.ts).
//
// Known, accepted limitation for this stage: state lives per edge
// instance and resets on cold start, so this does not enforce a hard
// ceiling across multiple concurrent regions/instances the way a shared
// store (Upstash Redis, etc.) would under real adversarial load. It's
// still a real deterrent against a single scripted client hammering
// login/signup, and it costs zero new infrastructure to ship today —
// swap in a shared store before relying on this as the only defense.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
// Bounds memory growth on a long-lived edge instance — without this, one
// bucket per distinct key would accumulate forever.
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > WINDOW_MS) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  existing.count += 1;
  return existing.count > MAX_REQUESTS_PER_WINDOW;
}
