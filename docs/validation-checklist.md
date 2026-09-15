# PurviewPilot.ai — Validation Checklist

Running list of what's been live-tested (in a real browser, against the real deployed app) versus what's been built and verified only at the database/code level. Kept up to date as we build; work through this once we pause building rather than stopping for each item as it lands.

Legend: ✅ Live-tested · ⚠️ Built + DB/logic-verified, not live-tested · 🚫 Blocked on an external account/credential

## Core loop

- ✅ Sign up, email confirm, log in, log out
- ✅ Project intake form (create, validation, inline error handling)
- ✅ Services-in-scope checklist (create and edit)
- ⚠️ Generate deliverables (14 of 18 types generable today — the original Purview catalog; the 4 new Bravo practice-area flagship types have no prompt template yet, see below) — 🚫 blocked on confirming the Azure OpenAI call actually succeeds end-to-end; every DB write in the pipeline verified directly, the AI call itself has not been exercised live. The 11 types beyond the original 3 additionally need their per-type prompt/section-schema output checked against real model output once live generation is unblocked — schema validation logic hasn't been exercised against real Azure OpenAI responses for these. Low-Level Design specifically needs its per-service conditional sections (same pattern as HLD) confirmed to actually omit sections for out-of-scope services in real output, not just in the prompt instructions. Compliance Report specifically needs its Review & Attestation Status disclaimer content confirmed to actually render as intended (not truncated, not quietly dropped) — this is the one type where the disclaimer showing up correctly is a real risk item, not just a nicety.
- 🚫 `cloud_migration_plan`/`app_modernization_plan`/`sharepoint_governance_plan`/`data_analytics_strategy` — enum values exist (`0013_bravo_practice_areas.sql`) but no `prompt_templates` row yet. Attempting to generate one today throws a clean `GenerationError` ("No active prompt template for X") rather than a silent failure or crash — verified by reading `getActiveTemplate` in `src/lib/generation/run.ts`, not yet exercised live. Next batch adds these templates.
- ✅ Generate form correctly hides DLP Design/Retention Strategy/Sensitivity Labeling Plan cards when the matching service isn't in the project's scope — confirmed live (see UI theme section below): a project with Sensitivity Labels unchecked correctly shows only 13 of 14 types, with Sensitivity Labeling Plan absent from the Design category
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
- ✅ Every authenticated page (dashboard, project detail, billing, admin KB) — confirmed live via Mike's phone screenshots (below); this environment still can't reach them directly.
- ✅ Mike live-tested the dashboard and Knowledge Base admin pages on the deployed app (phone screenshots) — confirmed the theme renders correctly. **Found and fixed a real bug this way**: the "Projects" heading and "New project" button (and 4 other similar heading+button header rows across the app) used `justify-between` with no minimum gap, so on his device they rendered touching/crowding with no breathing room. Fixed by adding `flex-wrap` + an explicit `gap` to every such row (`dashboard/page.tsx`, `admin/knowledge-base/page.tsx`, `admin/knowledge-base/[id]/page.tsx`, `dashboard/billing/page.tsx`'s plan row, `deliverable-view.tsx`'s failed-state header, and the main `Header` nav itself) — guarantees spacing and lets the button wrap to its own line if it still doesn't fit, rather than crowding.
- ✅ Fix re-confirmed on Mike's device in a follow-up round of phone screenshots — no overlap anywhere (dashboard, billing, KB admin, project detail).

## Fluent/personality UI pass (this pass)

Mike asked for the UI to feel like "an experience," referencing a client-facing deck with strong visual identity, and suggested a Microsoft Learn-ish direction given this product drafts Purview deliverables. bravocg.com is still unreachable from this sandbox, so rather than guess at Bravo's brand, this leans into an authentic Microsoft-product-family look: a Fluent 2 blue/purple-gradient theme and `@fluentui/react-icons` (Microsoft's real icon set, verified icon names against the installed package rather than guessed) for a gradient dashboard hero, icon chips on project cards, a category-grouped module-card redesign of the generate form (Core/Design/Testing & Change/Compliance, with a selection counter), and icons on every service checkbox and export button.

- ✅ Verified pre-merge via a throwaway preview route (`src/app/preview-tmp`, mock data, deleted before merging) rendering the actual production components (`GenerateForm`, `ServicesForm`, `DeliverableView`) — screenshotted at both desktop and phone (390px) width, no overlap issues. Exercised against dev mode, a real `next build`, and `next start` (production mode) before being deleted — not just dev-mode-only, since the bugs found here were RSC/build-architecture bugs that dev mode alone doesn't fully validate.
- ✅ Confirmed live on the deployed app via Mike's phone screenshots — theme, gradient hero, icons, and the module-card generate form all render correctly with no overlap. Also confirms the per-service deliverable gating works correctly in production, not just in the mock preview: on his "Bravo" project (DLP + Retention + Data Lifecycle + Insider Risk in scope, Sensitivity Labels not), the Design category correctly shows only DLP Design/Retention Strategy/Low-Level Design (3 items, Sensitivity Labeling Plan hidden) and the counter reads "13 of 13 selected" — exactly the expected 14-minus-1-gated-type count.
- **Two real bugs found and fixed, not just cosmetic ones**: (1) `@fluentui/react-icons` components can't render in a Server Component at all (Griffel's client-only styling hook) — fixed by re-exporting through a `"use client"` barrel (`src/components/icons.tsx`). (2) A Server Component that destructures an icon out of that barrel's object export and renders it itself gets `undefined` — a Turbopack/RSC quirk — fixed by adding a `<ServiceIcon service={x} />` client component so Server Components only ever pass a plain string across the boundary. Both were invisible to `tsc`/lint and would have shipped broken (blank/missing icons or a 500) if the preview route hadn't been built to catch them before Mike saw them live.
- ⚠️ Still needs a real click-through on Mike's device to confirm final visual polish (spacing, gradient rendering, icon sizes) the way the previous two passes were caught/confirmed.

## Bravo practice-area expansion (catalog complete)

Mike asked for the platform to cover everything sweepable from bravocg.com, not just Purview (PRD §12). All 3 batches (schema/domain model, generalized shared prompts, KB content + flagship deliverable prompts) are done — the catalog is now 18 deliverable types across 12 services / 5 practice areas.

- ⚠️ New services checklist grouping (intake form + project detail, grouped by practice area with icons) — not screenshotted from this environment (same Supabase-egress block as always); built following the identical, already-verified pattern the deliverable-category grouping uses (`GenerateForm`), so lower risk than a wholly new pattern, but genuinely unverified visually.
- ✅ `supabase/migrations/0013`, `0014`, `0015` verified directly via SQL: `pg_enum` shows 12 `service_type` and 18 `deliverable_type` values; `prompt_templates` shows 18 active rows total (exactly one per deliverable type, including the 4 new flagship prompts) with every superseded version-1 row correctly deactivated, not deleted; `knowledge_base_entries` shows 28 total rows (16 original Purview + 12 new, 3 per new service).
- ⚠️ The 4 new services (`cloud_migration`, `app_modernization`, `sharepoint`, `analytics_ai`) now retrieve real Knowledge Base entries (3 each) — content quality and retrieval relevance not yet checked against actual generated output, since that requires live AI generation (same Azure OpenAI gap as the rest of the catalog).
- 🚫 None of the 18 deliverable types, old or new, have been exercised through live AI generation from this environment. The 4 new flagship types specifically also need: HLD's 4 new per-service design sections confirmed to actually appear/omit correctly in real output (same check LLD needed for its original 8); the new KB entries confirmed to actually get retrieved and referenced (not just present in the table); and each new template's federal/GCC-High-specific guidance confirmed to surface correctly when compliance notes reference it.

## Things to specifically check once we do test

- Does a failed generation leave the UI in a sane state (no stuck "Generating…" button)?
- Does editing a deliverable and re-generating it correctly create a new version rather than clobbering the edit?
- Do the DOCX/PDF downloads actually open correctly in Word/Preview when downloaded through the real browser flow (not just the standalone builder test)?
- Stripe: does `checkout.session.completed` actually fire and land in `subscriptions` within a reasonable time? Does the Customer Portal's cancel flow correctly downgrade the account?
- Cross-account RLS on the newer tables (`deliverables`, `deliverable_versions`, `generation_jobs`) — verified by code review of the policies (same pattern as `projects`, which *was* live-verified in Epic A), but not re-tested with simulated sessions the way the KB admin policies were.
