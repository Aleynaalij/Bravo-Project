import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { deleteProject, getProject, updateProject } from "@/lib/projects/service";
import { toProjectDTO } from "@/lib/projects/dto";
import { projectUpdateSchema } from "@/lib/validation/project";

type Params = { params: Promise<{ id: string }> };

async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    await requireAccountId(supabase);
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const authError = await requireAuth(supabase);
  if (authError) return authError;

  const project = await getProject(supabase, id);
  if (!project) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(toProjectDTO(project, project.services));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const authError = await requireAuth(supabase);
  if (authError) return authError;

  const existing = await getProject(supabase, id);
  if (!existing) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error.message },
      { status: 422 },
    );
  }

  const row = await updateProject(supabase, id, parsed.data);
  return NextResponse.json(toProjectDTO(row, existing.services));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const authError = await requireAuth(supabase);
  if (authError) return authError;

  const existing = await getProject(supabase, id);
  if (!existing) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }

  await deleteProject(supabase, id);
  return new NextResponse(null, { status: 204 });
}
