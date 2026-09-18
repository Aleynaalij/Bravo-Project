# QuePilot.ai — Backup & Restore Procedure

**Status:** Draft v1 — reflects the live Supabase project as it actually exists today, not an aspirational posture
**Last updated:** 2026-09-15

## The current, real state — read this first

The audit's Phase 2 remediation item ("a tested restore procedure with a stated RPO/RTO") assumed a starting posture this project doesn't actually have. Checked directly against the live project (`mcp__Supabase__get_organization`) before writing anything else here:

**This Supabase organization is on the free plan. Supabase does not run automatic backups of any kind for free-plan projects.** Automatic daily backups start on the Pro plan; Point-in-Time Recovery (PITR) is a paid add-on on top of Pro. Supabase's own guidance for free-tier projects is explicit: *"We recommend that free tier plan projects regularly export their data using the Supabase CLI `db dump` command and maintain off-site backups."* — i.e., there is currently no safety net beyond whatever this project does for itself.

This is worth stating plainly rather than writing a procedure that reads as if a backup already exists: **as of this document, if the production database were lost or corrupted right now, there is nothing to restore from.** Everything below is the fix for that, not a description of an existing capability.

## What this document does

1. States the real RPO/RTO this project can actually commit to today (Section 1), and what upgrading the Supabase plan would buy (Section 2).
2. Ships a working nightly backup mechanism using only infrastructure this project already has — GitHub Actions — so there's something to restore from as soon as one secret is added (Section 3).
3. Gives the actual restore command sequence (Section 4).
4. Says exactly what was and wasn't verified against the live project, and why (Section 5).

## 1. Recovery objectives — as things stand today

| | Value | Why |
|---|---|---|
| **RPO (Recovery Point Objective)** | Up to 24 hours, once the nightly workflow in §3 is enabled | A daily `pg_dump` means worst case you lose up to a day of writes — no PITR, no faster automatic tier, on the free plan. |
| **RPO before §3 is enabled** | Unbounded (∞) | No automated or manual backup process runs today. |
| **RTO (Recovery Time Objective)** | Untested, estimate 1–4 hours | Restoring a `pg_dump` into a fresh or existing Supabase project via `psql`/`pg_restore`, plus re-pointing `NEXT_PUBLIC_SUPABASE_URL`/keys and a Vercel redeploy if a new project is needed. No restore has ever been rehearsed against this project (see §5) — this number is an estimate based on the dump's size, not a measurement. |
| **Storage/objects (e.g. branding logos, if any land in Supabase Storage)** | Not covered by `pg_dump` | Supabase's own docs note database backups only include Storage *metadata*, not the files themselves. Out of scope for this pass — flag as a follow-up if/when Storage holds anything that isn't reproducible from the app itself. |

A same-day incident recovers to "yesterday's data, restored within a few hours" today. That is a materially worse promise than "a tested RPO/RTO" implies, and upgrading the plan (§2) is the direct way to close that gap — this document doesn't paper over it with an untested claim.

## 2. What upgrading the Supabase plan buys (not done — a plan/budget decision, not a technical one)

| Plan | Backup capability | Cost |
|---|---|---|
| Free (current) | None automatic | $0 |
| Pro | Daily backups, 7-day retention | $25/mo base + compute |
| Pro + PITR add-on | Point-in-time recovery, ~2-minute RPO, 7/14/28-day retention tiers | +$100–$400/mo depending on retention window |
| Team | Daily backups, 14-day retention | Higher base tier |

This is a real, near-term budget decision for whoever owns billing, not something to decide inside a remediation PR. §3 below is the interim fix that costs nothing and works today regardless of plan.

## 3. Interim fix: a nightly logical backup via GitHub Actions

Nightly `pg_dump` of the full database schema + data, uploaded as a GitHub Actions artifact (`.github/workflows/backup.yml`). This uses infrastructure the repo already has — no new vendor account, matching the same constraint as every other Phase 2 item done this pass.

**Requires one manual step this session cannot do itself:** a repo secret named `SUPABASE_DB_URL` holding the project's direct Postgres connection string (`postgresql://postgres:[DB-PASSWORD]@db.qxouxxkoqtklvvkjozgt.supabase.co:5432/postgres`, or the pooler equivalent from the Supabase Dashboard's **Database → Connection string** page). This session has the project's anon/service-role API keys (for PostgREST/Auth) but not the Postgres wire-protocol password, which Supabase never exposes through those keys — a repo admin needs to add it under **Settings → Secrets and variables → Actions**.

Retention: GitHub's own artifact retention (30 days by default for this repo's plan) is the off-site copy for now — "off-site" in the sense of "not on the same infrastructure as the database itself," which is the actual property that matters here. Revisit if a longer or more durable retention window becomes a real requirement (e.g. pushing the dump to object storage instead of/in addition to an artifact).

## 4. Restore procedure

1. **Get the most recent dump.** Download the latest `db-backup-*` artifact from the `Nightly DB Backup` workflow's run history in GitHub Actions (or, if PITR/Pro-tier daily backups are enabled per §2, use the Supabase Dashboard's **Database → Backups** restore flow instead — that path is simpler and doesn't need this procedure).
2. **Confirm the target.** Restoring into the *same* project overwrites its current state — confirm that's actually intended, not a mistake, before going further. Restoring into a *new* project is safer for anything where "did we lose data since the dump" matters (compare before committing to overwrite).
3. **Restore:**
   ```bash
   psql "$SUPABASE_DB_URL" < db-backup-YYYY-MM-DD.sql
   ```
   (The dump is plain SQL via `pg_dump --format=plain`, so `psql` replays it directly — no `pg_restore`/custom-format step needed.)
4. **Re-point the app**, only if restoring into a new project: update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel's environment variables, then redeploy.
5. **Verify:** confirm `select count(*) from accounts;` (or another real table) returns the expected row count, and that a real login/dashboard load works before declaring the incident resolved.
6. **Custom role passwords:** Supabase's own docs note logical/physical backups don't carry custom role passwords — not applicable today (this project doesn't define custom Postgres roles), but worth knowing if that changes.

## 5. What was and wasn't verified

- ✅ **Confirmed directly against the live project** that it's on the free plan (`mcp__Supabase__get_organization` → `"plan":"free"`) and therefore has no automatic backups — this is the actual, current-state finding this whole document is built on, not an assumption.
- ✅ **Confirmed `pg_dump` is available** in this environment and the correct connection-string shape for this project.
- 🚫 **The actual nightly workflow has not run yet** — it ships in this PR but needs the `SUPABASE_DB_URL` secret added by a repo admin before its first real run; nothing to verify until then.
- 🚫 **No restore has ever been rehearsed** — doing so safely means either a disposable Supabase project (this session has no means to create paid/billable resources) or restoring into this project's own database, which is destructive and not something to do unprompted. The RTO estimate in §1 is therefore an estimate, explicitly labeled as one, not a measurement.
- 🚫 **Direct Postgres wire-protocol connectivity (port 5432) from this sandbox to the live project is blocked** — confirmed via `nc -zv db.qxouxxkoqtklvvkjozgt.supabase.co 5432` (connection failed) — consistent with the same network-egress restriction already documented elsewhere in `docs/validation-checklist.md` for every other write-path feature. This is why the workflow in §3 runs in GitHub Actions (which has its own, unrestricted network path) rather than being exercised from this sandbox.
