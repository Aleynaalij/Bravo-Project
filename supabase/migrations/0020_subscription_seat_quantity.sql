-- Real Stripe per-seat quantity billing (audit's Phase 2 remediation —
-- the seat-cap in migration-era Phase 1 work is a hard block, this makes
-- the actual bill reflect team size on top of that, not instead of it).
-- Tracks what Stripe's subscription item quantity actually is, kept in
-- sync from the webhook (source of truth for billing state) — not derived
-- from counting public.users rows, since those two can briefly disagree
-- (e.g. a quantity update in flight, or Stripe-side proration timing).
alter table public.subscriptions
  add column quantity integer not null default 1;
