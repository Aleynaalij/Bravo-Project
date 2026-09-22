import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject } from "@/lib/projects/service";
import { generateRequestSchema } from "@/lib/validation/deliverable";
import { enqueueGenerationJob, drainGenerationQueue } from "@/lib/generation/jobs";
import { assertUnderGenerationRateLimit, GenerationRateLimitError } from "@/lib/generation/rate-limit";
import {
  assertTrialNotExhausted,
  TrialExpiredError,
  TrialGenerationLimitError,
} from "@/lib/billing/trial";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
    }
    throw err;
  }

  try {
    await assertUnderGenerationRateLimit(supabase, accountId);
    await assertTrialNotExhausted(supabase, accountId);
  } catch (err) {
    if (err instanceof GenerationRateLimitError) {
      return NextResponse.json({ code: "rate_limited", message: err.message }, { status: 429 });
    }
    if (err instanceof TrialExpiredError || err instanceof TrialGenerationLimitError) {
      return NextResponse.json({ code: "trial_exhausted", message: err.message }, { status: 402 });
    }
    throw err;
  }

  const project = await getProject(supabase, id);
  if (!project) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }
  if (project.status === "closed") {
    return NextResponse.json(
      { code: "project_closed", message: "This project is closed and read-only — no new deliverables can be generated." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error.message },
      { status: 422 },
    );
  }

  // Enqueues and returns immediately — a cron-processed queue actually
  // runs each job in the background now (src/lib/generation/jobs.ts).
  // Poll GET /api/generation-jobs/[id] for status, per job id returned
  // here.
  const jobs = [];
  for (const deliverableType of parsed.data.deliverableTypes) {
    jobs.push(await enqueueGenerationJob(supabase, id, deliverableType));
  }

  // Starts draining the queue immediately after this response is sent,
  // rather than leaving these jobs for the next once-a-day cron tick —
  // see drainGenerationQueue's doc comment in jobs.ts.
  after(async () => {
    try {
      await drainGenerationQueue(createAdminClient());
    } catch (err) {
      console.error("[generation] Immediate queue drain failed:", err);
    }
  });

  return NextResponse.json(jobs, { status: 202 });
}
