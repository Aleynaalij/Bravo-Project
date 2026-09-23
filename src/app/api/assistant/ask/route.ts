import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { assertUnderEksRateLimit, EksRateLimitError } from "@/lib/eks/rate-limit";
import { runAskQue, AskQueError } from "@/lib/eks/ask-que";
import { askQueRequestSchema } from "@/lib/validation/ask-que";

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

  const parsed = askQueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "invalid_request", message: "A question is required and must be under 2000 characters." },
      { status: 400 },
    );
  }

  try {
    await assertUnderEksRateLimit(supabase, accountId);
    const result = await runAskQue(supabase, accountId, { id: user.id, email: user.email }, parsed.data.question);
    return NextResponse.json({ reply: result.reply });
  } catch (err) {
    if (err instanceof EksRateLimitError) {
      return NextResponse.json({ code: "rate_limited", message: err.message }, { status: 429 });
    }
    if (err instanceof AskQueError) {
      return NextResponse.json({ code: "generation_failed", message: err.message }, { status: 502 });
    }
    throw err;
  }
}
