import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject } from "@/lib/projects/service";
import { generateRequestSchema } from "@/lib/validation/deliverable";
import { createAndRunJob } from "@/lib/generation/jobs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
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

  // Runs sequentially and synchronously (see lib/generation/run.ts) — fine
  // for MVP's 1-3 deliverable types per request.
  const jobs = [];
  for (const deliverableType of parsed.data.deliverableTypes) {
    jobs.push(await createAndRunJob(supabase, id, deliverableType));
  }

  return NextResponse.json(jobs, { status: 202 });
}
