import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getJob } from "@/lib/generation/jobs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  const job = await getJob(supabase, id);
  if (!job) {
    return NextResponse.json({ code: "not_found", message: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
