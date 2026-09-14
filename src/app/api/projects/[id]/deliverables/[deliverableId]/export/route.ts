import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject } from "@/lib/projects/service";
import { getDeliverableWithContent } from "@/lib/generation/deliverables";
import { getBranding } from "@/lib/export/branding";
import { buildDocx } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";

type Params = { params: Promise<{ id: string; deliverableId: string }> };

// Deviates from docs/openapi.yaml's signed-URL response shape (POST →
// {downloadUrl, expiresAt}): this streams the file directly instead of
// uploading to Storage first. Exports are cheap to regenerate from
// deliverable_versions.content on every request, so there's no need for
// the Storage/signed-URL indirection at MVP scale — see docs/TDD.md §2.6.
export async function GET(request: Request, { params }: Params) {
  const { id: projectId, deliverableId } = await params;
  const format = new URL(request.url).searchParams.get("format");

  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json(
      { code: "validation_error", message: "format must be 'docx' or 'pdf'" },
      { status: 422 },
    );
  }

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

  const project = await getProject(supabase, projectId);
  if (!project) {
    return NextResponse.json({ code: "not_found", message: "Project not found" }, { status: 404 });
  }

  const deliverable = await getDeliverableWithContent(supabase, deliverableId);
  if (!deliverable || !deliverable.content) {
    return NextResponse.json(
      { code: "not_found", message: "Deliverable not found or not yet generated" },
      { status: 404 },
    );
  }

  const branding = await getBranding(supabase, accountId);
  const filenameBase = `${project.customer_name}-${deliverable.type}`.replace(/[^a-z0-9-]+/gi, "_");

  if (format === "docx") {
    const buffer = await buildDocx(deliverable.type, project.customer_name, deliverable.content, branding);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
      },
    });
  }

  const buffer = await buildPdf(deliverable.type, project.customer_name, deliverable.content, branding);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
