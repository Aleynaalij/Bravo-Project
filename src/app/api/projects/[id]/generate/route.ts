import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject } from "@/lib/projects/service";
import { generateRequestSchema } from "@/lib/validation/deliverable";
import { enqueueGenerationJob } from "@/lib/generation/jobs";
import { assertUnderGenerationRateLimit, GenerationRateLimitError } from "@/lib/generation/rate-limit";

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
  } catch (err) {
    if (err instanceof GenerationRateLimitError) {
      return NextResponse.json({ code: "rate_limited", message: err.message }, { status: 429 });
    }
    throw err;
  }

  const project = await getProject(supabase, id);
  if (!project) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
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

  return NextResponse.json(jobs, { status: 202 });
}
