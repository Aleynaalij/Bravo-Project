-- Real job-queue processing for AI generation (audit's Future Improvements
-- tier: "move AI generation to a real queue/worker architecture" —
-- generation_jobs already had the right shape, including a `queued`
-- default status; nothing ever actually left a job in that state, since
-- the application code ran generation synchronously and flipped straight
-- to in_progress on insert). This migration adds the one piece the table
-- itself needed: a way to atomically claim a batch of queued jobs so two
-- overlapping cron ticks (Vercel Cron gives no exclusivity guarantee)
-- can't both pick up and double-process the same job. `for update skip
-- locked` is the standard Postgres pattern for exactly this — a competing
-- claim just skips rows already locked by the other transaction instead
-- of blocking on them.
create or replace function public.claim_generation_jobs(job_limit int)
returns setof public.generation_jobs
language plpgsql
set search_path = public
as $$
begin
  return query
    update public.generation_jobs
    set status = 'in_progress'
    where id in (
      select id from public.generation_jobs
      where status = 'queued'
      order by created_at asc
      limit job_limit
      for update skip locked
    )
    returning *;
end;
$$;

-- Only the background worker (the cron route, using the service-role
-- client) should ever claim jobs — an authenticated user calling this
-- directly could claim and mark in_progress every account's queued jobs,
-- not just their own. Supabase's own project bootstrap grants EXECUTE on
-- every new public-schema function to anon/authenticated by default (via
-- ALTER DEFAULT PRIVILEGES) — revoking from PUBLIC alone doesn't remove
-- those two separate, explicit grants, so both have to be revoked by
-- name. (Caught this the hard way: the first version of this migration
-- only revoked from PUBLIC and a follow-up check of pg_proc's ACL showed
-- anon/authenticated still listed — fixed here, not left for later.)
revoke execute on function public.claim_generation_jobs(int) from public;
revoke execute on function public.claim_generation_jobs(int) from anon, authenticated;
grant execute on function public.claim_generation_jobs(int) to service_role;
