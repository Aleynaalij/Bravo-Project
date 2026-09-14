import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject, setProjectServices } from "@/lib/projects/service";
import { projectServicesSchema } from "@/lib/validation/project";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
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

  const existing = await getProject(supabase, id);
  if (!existing) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = projectServicesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error.message },
      { status: 422 },
    );
  }

  const services = await setProjectServices(supabase, id, parsed.data.services);
  return NextResponse.json(services);
}
