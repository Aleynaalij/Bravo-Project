import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { createProject, listProjects } from "@/lib/projects/service";
import { toProjectDTO } from "@/lib/projects/dto";
import { projectCreateSchema } from "@/lib/validation/project";

export async function GET() {
  const supabase = await createClient();

  try {
    await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
    }
    throw err;
  }

  // RLS scopes this to the caller's own account.
  const rows = await listProjects(supabase);
  return NextResponse.json({
    items: rows.map((row) => toProjectDTO(row)),
    page: 1,
    pageSize: rows.length,
    total: rows.length,
  });
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error.message },
      { status: 422 },
    );
  }

  const row = await createProject(supabase, accountId, parsed.data);
  return NextResponse.json(toProjectDTO(row, []), { status: 201 });
}
