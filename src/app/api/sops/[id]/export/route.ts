import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { getSop } from "@/lib/sop/service";
import { getBranding } from "@/lib/branding";
import { buildSopDocx } from "@/lib/export/sop-docx";

type Params = { params: Promise<{ id: string }> };

// SOPs had no export path at all before this — Que's "generate me an SOP"
// flow needed one to make good on "produces a download Word doc", and it
// was a genuine gap on the manual SOP library too (every deliverable type
// already exports to DOCX/PDF/PPTX; SOPs/Playbooks never got the same
// treatment). Scoped to DOCX only for now, matching what was actually
// asked for — PDF/PPTX for SOPs can follow the same buildSopDocx-sibling
// pattern later if it's needed.
export async function GET(_request: Request, { params }: Params) {
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

  // getSop is RLS-scoped (sops_select policy), so a sop belonging to
  // another account simply comes back null here — same "not found, not
  // forbidden" shape the deliverable export route uses.
  const sop = await getSop(supabase, id);
  if (!sop) {
    return NextResponse.json({ code: "not_found", message: "SOP not found." }, { status: 404 });
  }

  const branding = await getBranding(supabase, accountId);
  const buffer = await buildSopDocx({ title: sop.title, sopType: sop.sop_type, content: sop.content }, branding);
  const filenameBase = sop.title.replace(/[^a-z0-9-]+/gi, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
    },
  });
}
