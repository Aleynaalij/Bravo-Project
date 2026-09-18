import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processQueuedGenerationJobs } from "@/lib/generation/jobs";

// Triggered by Vercel Cron (see vercel.json). Once a day, not once a
// minute — a Vercel Hobby plan only permits daily cron schedules, and a
// higher frequency silently fails every deployment (discovered via a
// "Deployment failed" status check, not a build error: `* * * * *`
// deployed and merged clean through PR #45-#50 while the Vercel side of
// every one of those deploys was actually failing). Accepted trade-off
// until this account is on a paid plan: a queued job can now sit up to
// ~24h before this route ever claims it, not ~60s — see jobs.ts for the
// compounding effect on a queue deeper than one tick's job cap. Vercel
// signs cron requests with an Authorization header
// matching CRON_SECRET when that env var is set
// (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)
// — verified here rather than trusted, since this route processes every
// account's queued jobs and has no other access control of its own. Fails
// closed: an unconfigured CRON_SECRET means every request is rejected,
// not "anyone can trigger it."
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = await processQueuedGenerationJobs(admin);

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.status === "succeeded").length,
    failed: results.filter((r) => r.status === "failed").length,
  });
}
