# BravoPilot.ai — Validation Checklist

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

## Interactive demo (`/demo`)

- ✅ Full interactive flow verified via a throwaway no-auth preview route + Playwright before merging (not just "it compiles"): unchecking a service correctly removes its gated deliverable from Step 2 and re-adds it on re-check; Generate shows a loading state then reveals results; Edit → Save shows the "demo only, not stored" confirmation. Screenshotted at each stage.
- ✅ All 9 exports (3 canned deliverables × DOCX/PDF/PPTX) confirmed as structurally valid files — `file` correctly identifies the DOCX/PPTX as OOXML zip archives and the PDFs have a valid `%PDF` header — not just "the request returned 200."
- ⚠️ Not clicked through on the actual deployed app from a real browser session — same class of gap as every other UI feature this session (this sandbox can't sign in to the live app).
- Note for future maintenance: the 3 canned deliverables (Executive Summary, Statement of Work, DLP Design) are hand-written in `src/lib/demo/data.ts`, not derived from the real prompt templates — if those templates' section schemas change, the demo content won't automatically follow and could drift out of sync with what the real tool actually produces.

## Branding settings (`/dashboard/branding`)

The only two builder-consumed `branding` fields (`logo_url`, `primary_color`) had no settings UI to actually set them — `firm_name_override` was the sole field with a real path from database to export. This closes that gap end to end: a new settings page/form, and real logo/color support in all three export builders (previously only firm name was consumed).

- ✅ Verified directly against the real builders (`buildDocx`/`buildPdf`/`buildPptx`), not just "it compiles": a local self-signed HTTPS server stood in for a remote logo host (this sandbox's network-egress policy blocks fetches to arbitrary external domains, same restriction noted throughout this doc), fed through the real `fetchLogoAsset` fetch/validation path.
  - DOCX: unzipped the output, confirmed `word/media/*.png` present with the exact test-image byte count, and the accent hex (`FF3366`) present in `word/document.xml`.
  - PPTX: same check — `ppt/media/image-1-*.png` present, accent hex present in the slide XML.
  - PDF: routed through a real `next dev` server (react-pdf's dependency tree doesn't resolve cleanly under a bare `tsx`/Node ESM loader — `@react-pdf/hyphenate`'s `exports` map rejects the deep import Node's strict resolver expects, though Next's own bundler handles it fine) via a throwaway route, deleted before commit. Confirmed valid `%PDF-1.3` output, decompressed the content stream, and found both `/I1 Do` (the embedded image draw operator) and `1 0.2 0.4 scn` (0-1 scale RGB for `#FF3366`) applied to the title text.
- ✅ Graceful-degradation path verified, not just the happy path: an unreachable logo URL, a plain-`http://` URL, and a non-image `content-type` response all correctly resolve to "skip the logo" (`fetchLogoAsset` returns `null`) rather than throwing and failing the whole export.
- ✅ Found and fixed a real security gap while building this, not just a cosmetic one: `docs/TDD.md` had already flagged that `pptxgenjs` declares a transitive `image-size` dependency with a known DoS advisory (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq), deferred as "not exploitable today, no logo UI exists yet." Since this ships that UI, re-checked it properly: traced pptxgenjs's actual shipped bundle and confirmed the only code path that would invoke image-size is dead, commented-out source (it even `require()`s a different, uninstalled package name, `sizeof`) — but pinned `image-size` to a patched `2.0.4` via `package.json` `overrides` anyway rather than relying on reading a dependency's dead code to stay safe. `npm audit` is clean.
- ⚠️ Not clicked through on the actual deployed app from a real signed-in browser session — same class of gap as every other UI feature in this doc (this sandbox can't sign in to the live app). The settings form itself (save/validation/color-picker sync) is standard `useActionState` + Zod, the same pattern already live-verified for the Knowledge Base admin entry form, so lower risk than a wholly new pattern.
- Logo URL is restricted to `https://` + PNG/JPEG content-type + 5MB + a 5s timeout — the account owner controls their own `logo_url`, but this fetch still runs server-side, so it's a real (if low-severity, self-inflicted-at-worst) SSRF surface worth keeping narrow rather than accepting any URL/format.

## Settings hub, dark mode, active nav, logo fix, delete project

Mike asked for a real settings tab (change password, delete account, etc.), light/dark mode, a way to delete projects (there wasn't one), the "Bravo Pilot" two-word rendering fixed, and active-tab highlighting in the nav.

- ✅ Found and fixed a real environment issue while verifying, not just app bugs: Turbopack **dev-mode** hydration doesn't complete in this sandbox — its HMR WebSocket handshake fails (`ws://127.0.0.1:.../hmr`, `ERR_INVALID_HTTP_RESPONSE`) and, unlike webpack's dev server, Turbopack's dev client appears to gate client-side hydration on that socket connecting. Confirmed via direct DOM inspection (`__reactProps$...` keys absent on any element in dev mode) and confirmed the fix: `next build && next start` (production mode) hydrates normally, same components, same route. This means dev-mode Playwright checks in this environment need production mode instead — noted here so future work doesn't re-diagnose it from scratch.
- ✅ Logo fix verified via a throwaway preview route + Playwright screenshot: "BravoPilot" now renders as one visually continuous word (color-split at "Bravo"/"Pilot", no gap) — root cause was `Link`'s `inline-flex gap-2` treating the raw "Bravo" text node and the `Pilot` span as two separate flex items, so the gap landed between them instead of only between the icon badge and the wordmark.
- ✅ Active-tab highlighting verified the same way: the current route's nav link shows a bottom-border indicator; confirmed correct on a route matching one nav item exactly.
- ✅ Dark mode verified end-to-end via the real toggle control (not just CSS injected externally): clicking System/Light/Dark sets `data-theme` correctly, every section of the Settings page (profile/appearance/security/branding/billing/danger-zone cards, inputs, the color-picker swatch) re-themes correctly, and the choice persists across a full page reload via the no-FOUC bootstrap script. Screenshotted at desktop and phone (390px) width.
- ✅ Delete-project verified as far as this sandbox allows: a throwaway route exercising the real `DeleteProjectButton` confirmed the `confirm()` gate genuinely blocks submission on Cancel (page unchanged) and genuinely submits to the real `deleteProjectAction` on Confirm — which then hit this environment's standard network-egress block on the real Supabase host, the same wall every other write-path feature in this doc hits. The service-layer `deleteProject()` function itself already existed and was already correct (RLS's `projects_all_own_account` policy scopes it to the caller's own account, and every FK from `project_services`/`deliverables`/`deliverable_versions`/`generation_jobs` down is already `on delete cascade` in the schema) — the gap was purely that no UI had ever called it.
- ⚠️ Change-password and delete-account Server Actions not exercised against a live Supabase session (same network block) — reviewed against the existing `requireAccountId`/admin-client patterns already live-verified elsewhere (billing, KB admin).
- ⚠️ Not clicked through on the actual deployed app from a real signed-in browser session — same class of gap as every other UI feature in this doc.

## Knowledge base parity fill

Mike asked to make sure the knowledge base is up to date. Rather than guess, queried the live table directly (`select service_type, count(*) ... group by service_type`) and found a real, concrete gap: 5 of 12 services had only 1-2 `knowledge_base_entries` rows instead of the 3-entry (2 general + 1 Government) pattern every other service already followed.

- ✅ Applied `supabase/migrations/0016_kb_parity_fill.sql` directly to the live project and re-queried: all 12 services now show exactly 3 entries (2 general, 1 Government) — 36 rows total, up from 28.
- ⚠️ Content quality/retrieval relevance not checked against actual generated output — same live-AI-generation gap as the rest of the catalog (no Azure OpenAI access from this sandbox).

## FileVault (`/dashboard/vault`)

Mike asked for a place where generated docs are automatically there without needing to download first, organized by project, with view/print/download/email and a built-in PDF viewer.

- Deliberately doesn't add a second copy of generated files in Storage — `deliverable_versions.content` already persists forever the moment a deliverable is generated (existing architecture, `docs/TDD.md` §2.6), so "always there, no download required" was already true of the underlying data. What was actually missing was a single place to browse it across every project instead of only from within each project. FileVault is a gallery view over the same on-demand export pipeline the project detail page already uses, not new storage infrastructure.
- ✅ Verified via a throwaway preview route + Playwright (mocked project/deliverable data, deleted before commit), against a real production build (`next build && next start` — see the dev-mode Turbopack hydration note earlier in this doc):
  - The View button opens a modal with the correct `?disposition=inline` iframe URL and a separate `?disposition=inline`-free Download link; Close correctly unmounts it.
  - All 9 DOCX/PDF/PPTX row links (3 formats × 3 mock deliverables) resolve to the correct per-deliverable export URLs.
  - Email's `mailto:` construction doesn't throw and doesn't navigate the page away.
  - Screenshotted at desktop and phone (390px) width — grouped-by-project layout wraps cleanly, no overlap.
- ⚠️ The PDF iframe itself only showed the expected 401 (no real session in the preview) — actual PDF rendering inside the modal, against a deliverable with real generated content, not exercised (same network-egress block on the real Supabase host as every other write/read-path feature in this doc).
- Email is a `mailto:` containing a link back into the app, not an actual attached file or server-sent email — there's no email-sending provider configured in this project, and a generated-on-demand file can't be attached to a `mailto:` link regardless. The recipient needs their own BravoPilot session to open the link; the UI copy says so.

## Multi-seat teams

Mike asked for multi-seat support — a ~46-person firm getting one individual account was a real gap, not a nicety (PRD §11).

- ✅ Schema/RLS/trigger change (`supabase/migrations/0017_multi_seat_teams.sql`) applied directly to the live project and confirmed clean via the Supabase security advisor: the new `auth_is_owner()` function shows the exact same accepted "SECURITY DEFINER callable by signed-in users" finding already accepted for `auth_account_id()` and `is_platform_admin()`, not a new/different one. Confirmed the pre-existing `role` data (one row, `'owner'`) wouldn't violate the new check constraint before applying it.
- ✅ Team section UI verified via a throwaway preview route + Playwright, both as owner and as a non-owner member (mocked data, deleted before commit): the invite form and promote/remove controls only render for the owner; a non-owner sees a read-only roster and an explanatory note instead; the Remove confirm-dialog shows the expected message and genuinely blocks submission until confirmed.
- 🚫 The actual invite round trip — `inviteUserByEmail` sending a real email, the recipient exchanging the invite code for a session, `handle_new_auth_user()` correctly branching them into the inviter's account as `'member'`, landing on `/set-password` — could not be exercised live. Same network-egress block on the real Supabase host as every other write-path feature in this doc; this one specifically also needs a second real inbox to receive the invite, which this environment has no way to check regardless of network access.
- ⚠️ Owner-gating on billing/account-deletion actions (`requireAccountOwner`) reviewed against the existing `requireAccountId`/`requirePlatformAdmin` patterns, not exercised against two real accounts with different roles.

## Dashboard recent-activity widget

Small follow-up suggestion Mike accepted: a "Recent activity" panel on the dashboard home page, reusing FileVault's `VaultEntryCard` rather than building a second row UI.

- ✅ Verified via a throwaway preview route + Playwright: since this list spans multiple projects (unlike FileVault, where the project name is already the group heading), added a `showCustomerName` prop to `VaultEntryCard` so each row reads "Customer — Deliverable" here specifically; confirmed FileVault itself is unaffected (prop defaults to `false`, not passed there). Screenshotted at desktop and phone (390px) width — wraps cleanly, no overlap.
- Hidden entirely (not an empty state) when there's nothing generated yet, consistent with how a brand-new account's dashboard looks today.

## Things to specifically check once we do test

- Does a failed generation leave the UI in a sane state (no stuck "Generating…" button)?
- Does editing a deliverable and re-generating it correctly create a new version rather than clobbering the edit?
- Do the DOCX/PDF downloads actually open correctly in Word/Preview when downloaded through the real browser flow (not just the standalone builder test)?
- Stripe: does `checkout.session.completed` actually fire and land in `subscriptions` within a reasonable time? Does the Customer Portal's cancel flow correctly downgrade the account?
- Cross-account RLS on the newer tables (`deliverables`, `deliverable_versions`, `generation_jobs`) — verified by code review of the policies (same pattern as `projects`, which *was* live-verified in Epic A), but not re-tested with simulated sessions the way the KB admin policies were.
