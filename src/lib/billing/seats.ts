// Closes a real, immediate revenue leak the audit flagged: multi-seat
// shipped with zero seat limit, so any account — trial or paid — could add
// unlimited teammates on the cheapest ($49/mo) plan. This is the minimum
// viable fix: an explicit cap enforced at invite time, not real Stripe
// per-seat quantity billing (a bigger change — new Price objects or
// subscription-quantity sync on every team change — that a "consultant"-
// vs-"professional" flat-fee model doesn't obviously need yet).
//
// These specific numbers are a placeholder business decision, same as the
// Stripe price IDs themselves (docs/PRD.md §6.6) — a human needs to set
// real ones. Consultant matches its own name/positioning (one consultant,
// one seat) — that's the exact scenario the audit named. Professional's
// cap is a bounded-but-generous default for a small firm team; it is not
// sized for Bravo Consulting Group's actual ~46-person headcount (see
// docs/validation-checklist.md's multi-seat teams entry) — a firm that
// size needs a real pricing conversation (a higher tier, or real per-seat
// billing), not a cap picked here.
const SEAT_LIMITS: Record<string, number> = {
  trial: 1,
  consultant: 1,
  professional: 10,
};

const DEFAULT_SEAT_LIMIT = 1;

export function getSeatLimit(plan: string): number {
  return SEAT_LIMITS[plan] ?? DEFAULT_SEAT_LIMIT;
}
