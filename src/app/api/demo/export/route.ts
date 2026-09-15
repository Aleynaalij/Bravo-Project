import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDocx } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";
import { buildPptx } from "@/lib/export/pptx";
import { DEMO_PROJECT, DEMO_CONTENT, DEMO_CANDIDATE_DELIVERABLES } from "@/lib/demo/data";

// Lets the /demo walkthrough's export buttons produce a real downloadable
// file — the one part of the real export flow that needs neither AI
// generation nor a database row, so there's no reason to fake it. Auth-
// gated (any signed-in user) purely so this isn't an anonymous public
// file-generation endpoint; the content itself is the same canned demo
// data for everyone, not account-specific.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ code: "unauthorized", message: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const type = url.searchParams.get("type");

  if (format !== "docx" && format !== "pdf" && format !== "pptx") {
    return NextResponse.json(
      { code: "validation_error", message: "format must be 'docx', 'pdf', or 'pptx'" },
      { status: 422 },
    );
  }
  const isDemoType = (t: string | null): t is (typeof DEMO_CANDIDATE_DELIVERABLES)[number] =>
    (DEMO_CANDIDATE_DELIVERABLES as readonly string[]).includes(t ?? "");
  if (!isDemoType(type)) {
    return NextResponse.json({ code: "validation_error", message: "unknown demo deliverable type" }, { status: 422 });
  }

  const content = DEMO_CONTENT[type];
  const filenameBase = `${DEMO_PROJECT.customerName}-${type}-DEMO`.replace(/[^a-z0-9-]+/gi, "_");

  if (format === "docx") {
    const buffer = await buildDocx(type, DEMO_PROJECT.customerName, content, null);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdf(type, DEMO_PROJECT.customerName, content, null);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
      },
    });
  }

  const buffer = await buildPptx(type, DEMO_PROJECT.customerName, content, null);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filenameBase}.pptx"`,
    },
  });
}
