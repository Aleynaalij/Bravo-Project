import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { assistantChatRequestSchema } from "@/lib/validation/assistant";
import { runAssistantTurn } from "@/lib/assistant/chat";
import { AssistantRateLimitError } from "@/lib/assistant/rate-limit";

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

  const parsed = assistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "invalid_request", message: "Message is required and must be under 2000 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await runAssistantTurn(supabase, {
      accountId,
      userId: user.id,
      userEmail: user.email,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AssistantRateLimitError) {
      return NextResponse.json({ code: "rate_limited", message: err.message }, { status: 429 });
    }
    throw err;
  }
}
