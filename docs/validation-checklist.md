# PurviewPilot.ai — Validation Checklist

Running list of what's been live-tested (in a real browser, against the real deployed app) versus what's been built and verified only at the database/code level. Kept up to date as we build; work through this once we pause building rather than stopping for each item as it lands.

Legend: ✅ Live-tested · ⚠️ Built + DB/logic-verified, not live-tested · 🚫 Blocked on an external account/credential

## Core loop

- ✅ Sign up, email confirm, log in, log out
- ✅ Project intake form (create, validation, inline error handling)
- ✅ Services-in-scope checklist (create and edit)
- ⚠️ Generate deliverables (Executive Summary, SOW, HLD) — 🚫 blocked on confirming the Azure OpenAI call actually succeeds end-to-end; every DB write in the pipeline verified directly, the AI call itself has not been exercised live
- ⚠️ Inline editing of generated deliverable content — depends on the above producing real content first
- ⚠️ DOCX export — builder verified standalone (valid file, sample sent to Mike), not exercised through the actual app/download flow
- ⚠️ PDF export — same as DOCX
- ⚠️ Error surfacing on a failed generation (does the on-screen error message actually show what's useful) — untested since no live generation has been attempted yet

## Knowledge Base admin

- ⚠️ `/admin/knowledge-base` list/create/edit/delete — RLS verified directly (simulated admin + non-admin sessions against the live DB), UI itself never clicked through
- ⚠️ Admin nav link only shows for `is_platform_admin` accounts — logic verified, not visually confirmed

## Billing

- ⚠️ Stripe Checkout (`/dashboard/billing`) — 🚫 blocked on a real Stripe account with Products/Prices created; webhook write path verified directly against the live DB
- ⚠️ Stripe Customer Portal — same blocker
- ⚠️ Webhook signature verification — can't test without a real Stripe webhook secret and an actual Stripe-signed request

## Things to specifically check once we do test

- Does a failed generation leave the UI in a sane state (no stuck "Generating…" button)?
- Does editing a deliverable and re-generating it correctly create a new version rather than clobbering the edit?
- Do the DOCX/PDF downloads actually open correctly in Word/Preview when downloaded through the real browser flow (not just the standalone builder test)?
- Stripe: does `checkout.session.completed` actually fire and land in `subscriptions` within a reasonable time? Does the Customer Portal's cancel flow correctly downgrade the account?
- Cross-account RLS on the newer tables (`deliverables`, `deliverable_versions`, `generation_jobs`) — verified by code review of the policies (same pattern as `projects`, which *was* live-verified in Epic A), but not re-tested with simulated sessions the way the KB admin policies were.
