import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getProject } from "@/lib/projects/service";
import { getDeliverableWithContent } from "@/lib/generation/deliverables";
import { canExportForClient } from "@/lib/generation/review";
import { getBranding } from "@/lib/branding";
import { buildDocx } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";
import { buildPptx } from "@/lib/export/pptx";
import { logUsageEvent } from "@/lib/usage/service";

type Params = { params: Promise<{ id: string; deliverableId: string }> };

// Deviates from docs/openapi.yaml's signed-URL response shape (POST →
// {downloadUrl, expiresAt}): this streams the file directly instead of
// uploading to Storage first. Exports are cheap to regenerate from
// deliverable_versions.content on every request, so there's no need for
// the Storage/signed-URL indirection at MVP scale — see docs/TDD.md §2.6.
export async function GET(request: Request, { params }: Params) {
  const { id: projectId, deliverableId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format");
  // "inline" lets the FileVault's built-in PDF viewer embed the file in an
  // <iframe> instead of triggering a download — only meaningful for PDF,
  // since browsers can't render DOCX/PPTX regardless of this header.
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (format !== "docx" && format !== "pdf" && format !== "pptx") {
    return NextResponse.json(
      { code: "validation_error", message: "format must be 'docx', 'pdf', or 'pptx'" },
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

  // The approval-workflow gate (migration 0044 / src/lib/generation/review.ts)
  // — only applies to a genuine client-facing download (the default
  // "attachment" disposition). "inline" is FileVault's own PDF preview
  // (vault-entry-card.tsx) and this same UI's pre-approval review view —
  // a reviewer has to be able to see a draft to approve it, so that path
  // stays open regardless of review_status.
  if (disposition === "attachment" && !canExportForClient(deliverable.reviewStatus)) {
    return NextResponse.json(
      {
        code: "not_approved",
        message: "This deliverable needs to be approved before it can be exported.",
      },
      { status: 403 },
    );
  }

  // Fire-and-forget, best-effort — see logUsageEvent's own docstring. The
  // one genuinely new usage signal this project didn't already track
  // anywhere: whether a generated deliverable is ever actually exported.
  await logUsageEvent(supabase, {
    accountId,
    eventType: "deliverable.exported",
    metadata: { deliverableType: deliverable.type, format, disposition },
  });

  const branding = await getBranding(supabase, accountId);
  const filenameBase = `${project.customer_name}-${deliverable.type}`.replace(/[^a-z0-9-]+/gi, "_");

  if (format === "docx") {
    const buffer = await buildDocx(deliverable.type, project.customer_name, deliverable.content, branding);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `${disposition}; filename="${filenameBase}.docx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdf(deliverable.type, project.customer_name, deliverable.content, branding);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filenameBase}.pdf"`,
      },
    });
  }

  const buffer = await buildPptx(deliverable.type, project.customer_name, deliverable.content, branding);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `${disposition}; filename="${filenameBase}.pptx"`,
    },
  });
}
