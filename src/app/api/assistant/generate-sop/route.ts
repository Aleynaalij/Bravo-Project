import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { assertUnderEksRateLimit, EksRateLimitError } from "@/lib/eks/rate-limit";
import { generateSopFromAskQue } from "@/lib/eks/ask-que";
import { generateSopFromAskQueRequestSchema } from "@/lib/validation/ask-que";
import { StructuredDocGenerationError } from "@/lib/generation/structured-doc";

// The "generate an SOP for this" follow-up — a separate request from
// /api/assistant/ask on purpose, so a consultant only pays for a second
// AI call when they explicitly ask for one, not on every question.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ code: "unauthorized", message: "You need to be signed in to do this." }, { status: 401 });
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ code: "unauthorized", message: err.message }, { status: 401 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_request", message: "Malformed request body." }, { status: 400 });
  }

  const parsed = generateSopFromAskQueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_request", message: "A question and reply are required." }, { status: 400 });
  }

  try {
    await assertUnderEksRateLimit(supabase, accountId);
    const sop = await generateSopFromAskQue(
      supabase,
      accountId,
      { id: user.id, email: user.email },
      parsed.data.question,
      parsed.data.reply,
    );
    return NextResponse.json({ sopId: sop.id, sopTitle: sop.title });
  } catch (err) {
    if (err instanceof EksRateLimitError) {
      return NextResponse.json({ code: "rate_limited", message: err.message }, { status: 429 });
    }
    if (err instanceof StructuredDocGenerationError) {
      return NextResponse.json({ code: "generation_failed", message: err.message }, { status: 502 });
    }
    throw err;
  }
}
