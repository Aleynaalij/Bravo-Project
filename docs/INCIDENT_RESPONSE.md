# BravoPilot.ai — Incident Response Runbook

**Status:** Draft v1 — sized for the team that actually exists today (no on-call rotation, no NOC), not an aspirational enterprise process
**Last updated:** 2026-09-15

## Read this first: what "detection" actually means today

Sentry is wired into the codebase (`src/instrumentation.ts`, `src/sentry.*.config.ts`) but `NEXT_PUBLIC_SENTRY_DSN` is unset in production — per its own documented no-DSN behavior, it is currently a no-op. **There is no automated error alerting running today.** Detection is one of: a customer email, a founder/consultant noticing something broken while using the product themselves, or a Vercel deploy-failure notification. This runbook is written around that reality, with the gap called out explicitly (§5) rather than assuming a DSN is configured.

## 1. Severity levels

| Sev | Definition | Example | Response target |
|---|---|---|---|
| **SEV-1** | Full outage, or any data exposure/breach across accounts | Site down for everyone; RLS bypass letting one account see another's data; the SEC-01-class injection bug this project already found once | Immediate — drop everything |
| **SEV-2** | A core flow broken for some/all users, no data exposure | Generation fails for every account; login broken; Stripe webhook silently failing (subscriptions stop updating) | Same business day |
| **SEV-3** | Degraded but workable | One deliverable type's export is broken; slow generation; a non-critical UI bug | Next business day / normal sprint |

**Escalate to SEV-1 immediately, don't wait for confirmation, if any of these are even plausible:** cross-account data visible (an RLS gap), auth bypass, a leaked credential (Stripe key, service-role key, OpenAI key) in a commit or log, or the AI provider's response containing another account's data (a prompt-injection or context-leak scenario SEC-02's mitigations don't fully rule out — see that PR's "what this doesn't cover" note).

## 2. Roles (as the team actually is — one or a few people, not a department)

There is no dedicated on-call rotation. In practice: whoever is available and has the access below responds. This section exists so that when the team grows past "everyone has access to everything," it's already written down who needs what, not scrambled together during a live incident.

- **Incident lead** — whoever picks it up first. Owns the timeline, decides severity, decides when it's resolved. Doesn't have to be the person who fixes it.
- **Access needed to actually respond:** Supabase Dashboard/project access (or the equivalent MCP tooling this session used), Vercel project access, Stripe Dashboard access (for billing-incident SEV-2s), the `platform_admin` flag in-app (for anything needing DB-level investigation beyond what the UI exposes).

## 3. Detection sources, ranked by how much you can currently rely on them

1. **Direct user report** (email, in-app — there's no support widget yet, so this is literally an email today) — the most reliable source right now, and should be treated as credible until ruled out, not dismissed.
2. **Founder/consultant self-use** — the demo (`/demo`) and dogfooding the real app are the closest thing to synthetic monitoring this project has.
3. **Vercel deploy failures / build logs** — catches build-time breakage, not runtime errors.
4. **Supabase project logs** (`mcp__Supabase__get_advisors`, `query_logs`, or the Dashboard's Logs section) — reactive, not alerting; useful once you already suspect a problem, not for finding one.
5. **Sentry** — wired up, currently inert (no DSN). Once real: this becomes the primary source and this list's ordering should be revisited.

## 4. Response steps

1. **Acknowledge.** Even a one-line reply to whoever reported it ("looking into this now") — the audit's own review of this project's support posture is that it currently has none; a fast acknowledgment is the cheapest possible fix for that.
2. **Confirm and scope.** Reproduce it if possible. For anything touching account data: check whether it's one account or many — this changes the severity fast (§1).
3. **Contain, if it's a security issue.** Don't wait for a full fix to reduce exposure:
   - Leaked credential → rotate it immediately (Stripe key in the Stripe Dashboard, Supabase service-role/anon keys in the project's API settings, OpenAI/Azure key in that provider's console) and redeploy with the new value in Vercel's env vars.
   - Suspected RLS gap → the fastest safe containment is usually narrowing the specific policy (e.g., adding a stricter `using` clause) via `mcp__Supabase__apply_migration`, verified against `mcp__Supabase__get_advisors` before and after, same as every RLS change this project has already made.
   - Exposed account data in generated AI output → this is the one class of incident that isn't purely technical: the affected customer needs to be told what happened, not just have the bug fixed silently.
4. **Fix.** Same engineering discipline as any other change in this codebase: a branch, `tsc`/`eslint`/`test`/`build` all clean, a PR, CI green, merged — an incident is not an excuse to skip the process that's supposed to catch a bad fix from becoming a second incident.
5. **Verify the fix actually landed** in production (a real request against the deployed app, or the Supabase advisor re-check for a DB-side fix), not just that the PR merged.
6. **Communicate resolution** to whoever was affected, in plain language — what happened, what was fixed, and if it's a SEV-1/data incident, what they should do (rotate their own credentials if relevant, etc.).

## 5. Known gaps in this process (stated plainly, not glossed over)

- **No live alerting.** Sentry has no DSN configured. Until it does, detection depends on someone noticing. Wiring up a real DSN and confirming an event actually lands in a real Sentry project is a fast, high-value follow-up — flagged here rather than done in this pass since it needs a real Sentry account/org this session doesn't have.
- **No status page.** No way to communicate a known outage to users other than direct, per-user contact. A real status page is its own Phase 2/3 item (needs a vendor account) — not attempted here.
- **No on-call rotation or paging.** Fine for the team's current size; revisit before this stops being true.
- **No incident log/history.** Nothing currently records past incidents for pattern-spotting. A lightweight fix — even a running doc in this repo — is worth doing the first time this runbook is actually used for real, not preemptively invented here as a format nobody has needed yet.

## 6. Postmortem (for SEV-1/SEV-2 only)

Write it down within a few days, while it's fresh, covering: what happened, when it was detected vs. when it started (the gap is the real signal — see §5's alerting gap), what fixed it, and one concrete change that would have caught it sooner or prevented it. Keep it blameless — the point is the process gap, not who wrote the bug. There's no fixed template enforced here; a short entry in a `docs/postmortems/` file (create the directory the first time it's needed) is enough to start.
