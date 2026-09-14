# PurviewPilot.ai — Validation Checklist

Running list of what's been live-tested (in a real browser, against the real deployed app) versus what's been built and verified only at the database/code level. Kept up to date as we build; work through this once we pause building rather than stopping for each item as it lands.

Legend: ✅ Live-tested · ⚠️ Built + DB/logic-verified, not live-tested · 🚫 Blocked on an external account/credential

## Core loop

- ✅ Sign up, email confirm, log in, log out
- ✅ Project intake form (create, validation, inline error handling)
- ✅ Services-in-scope checklist (create and edit)
- ⚠️ Generate deliverables (all 14 types — Executive Summary, SOW, HLD, DLP Design, Retention Strategy, Sensitivity Labeling Plan, Low-Level Design, Testing Guide, UAT Plan, Rollback Procedures, Operational Runbooks, CAB Request, Change Management Plan, Compliance Report) — 🚫 blocked on confirming the Azure OpenAI call actually succeeds end-to-end; every DB write in the pipeline verified directly, the AI call itself has not been exercised live. The 11 types beyond the original 3 additionally need their per-type prompt/section-schema output checked against real model output once live generation is unblocked — schema validation logic hasn't been exercised against real Azure OpenAI responses for these. Low-Level Design specifically needs its per-service conditional sections (same pattern as HLD) confirmed to actually omit sections for out-of-scope services in real output, not just in the prompt instructions. Compliance Report specifically needs its Review & Attestation Status disclaimer content confirmed to actually render as intended (not truncated, not quietly dropped) — this is the one type where the disclaimer showing up correctly is a real risk item, not just a nicety.
- ⚠️ Generate form correctly hides DLP Design/Retention Strategy/Sensitivity Labeling Plan checkboxes when the matching service isn't in the project's scope — logic verified by code review (`DELIVERABLE_REQUIRES_SERVICE` filter), not clicked through in a browser
- ⚠️ Inline editing of generated deliverable content — depends on the above producing real content first
- ⚠️ DOCX export — builder verified standalone (valid file, sample sent to Mike), not exercised through the actual app/download flow
- ⚠️ PDF export — same as DOCX
- ⚠️ PPTX export — builder verified standalone (valid file, opens correctly), not exercised through the actual app/download flow
- ⚠️ Error surfacing on a failed generation (does the on-screen error message actually show what's useful) — untested since no live generation has been attempted yet

## Knowledge Base admin

- ⚠️ `/admin/knowledge-base` list/create/edit/delete — RLS verified directly (simulated admin + non-admin sessions against the live DB), UI itself never clicked through
- ⚠️ Admin nav link only shows for `is_platform_admin` accounts — logic verified, not visually confirmed

## Billing

- ⚠️ Stripe Checkout (`/dashboard/billing`) — 🚫 blocked on a real Stripe account with Products/Prices created; webhook write path verified directly against the live DB
- ⚠️ Stripe Customer Portal — same blocker
- ⚠️ Webhook signature verification — can't test without a real Stripe webhook secret and an actual Stripe-signed request

## UI theme (this pass)

Replaced the untouched `create-next-app` scaffold (literal "Create Next App" browser tab title, no color beyond black/white/gray) with a real navy/slate theme, a shared `Header`/`Logo`, and reusable `Button`/`Card`/`Badge`/`Alert` components used consistently across every page. Not pulled from bravocg.com's actual brand — that domain is blocked by this sandbox's network egress policy (same restriction noted elsewhere in this doc), so the palette is a professional-services approximation with clearly-named CSS variables (`--brand`, `--brand-dark` in `globals.css`) for an easy swap once we have Bravo's real hex values.

- ✅ Login page — screenshotted via a local dev server + Playwright; renders correctly (navy button, card layout, focus states)
- ✅ Signup page — same, screenshotted mid-flow
- ⚠️ Every authenticated page (dashboard, project detail, billing, admin KB) — restyled with the same shared components verified above, not itself screenshotted from this environment: signing up a live test account to reach them hit the same Supabase-egress block noted elsewhere in this doc (`POST /signup` got a non-JSON "Host not in..." response from the sandbox's own proxy, not a bug in the signup code). `tsc`/`lint`/`build` all pass and no raw pre-theme classes (`bg-black`, `text-gray-*`, `bg-red-*`, etc.) remain anywhere in `src/app` or `src/components` — confirmed by grep.
- ✅ Mike live-tested the dashboard and Knowledge Base admin pages on the deployed app (phone screenshots) — confirmed the theme renders correctly. **Found and fixed a real bug this way**: the "Projects" heading and "New project" button (and 4 other similar heading+button header rows across the app) used `justify-between` with no minimum gap, so on his device they rendered touching/crowding with no breathing room. Fixed by adding `flex-wrap` + an explicit `gap` to every such row (`dashboard/page.tsx`, `admin/knowledge-base/page.tsx`, `admin/knowledge-base/[id]/page.tsx`, `dashboard/billing/page.tsx`'s plan row, `deliverable-view.tsx`'s failed-state header, and the main `Header` nav itself) — guarantees spacing and lets the button wrap to its own line if it still doesn't fit, rather than crowding. Confirmed the fix behaves correctly via a standalone static repro of the exact markup at narrow widths, but the corrected version hasn't been re-confirmed on Mike's actual device yet.

## Things to specifically check once we do test

- Does a failed generation leave the UI in a sane state (no stuck "Generating…" button)?
- Does editing a deliverable and re-generating it correctly create a new version rather than clobbering the edit?
- Do the DOCX/PDF downloads actually open correctly in Word/Preview when downloaded through the real browser flow (not just the standalone builder test)?
- Stripe: does `checkout.session.completed` actually fire and land in `subscriptions` within a reasonable time? Does the Customer Portal's cancel flow correctly downgrade the account?
- Cross-account RLS on the newer tables (`deliverables`, `deliverable_versions`, `generation_jobs`) — verified by code review of the policies (same pattern as `projects`, which *was* live-verified in Epic A), but not re-tested with simulated sessions the way the KB admin policies were.
