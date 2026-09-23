import { createClient } from "@/lib/supabase/server";
import { requireAccountId, UnauthorizedError } from "@/lib/auth/session";
import { codeCreatorRequestSchema } from "@/lib/validation/automation";
import { assertUnderAutomationRateLimit, AutomationRateLimitError } from "@/lib/automation/rate-limit";
import {
  prepareCodeCreatorRequest,
  finalizeCodeCreatorRequest,
  recordCodeCreatorFailure,
  CodeCreatorError,
} from "@/lib/automation/creator";
import { streamCompletion } from "@/lib/ai/provider";
import { writeAuditLog } from "@/lib/audit/service";

// Same 180s ceiling as every other synchronous AI-generation route in
// this app — this is the one that actually calls the AI provider now,
// not creator/page.tsx, since generation moved out of a Server Action
// and into this streaming route.
export const maxDuration = 180;

// Code Creator's chalkboard view needs to watch the response arrive, not
// wait for a single Server Action round trip — Server Actions don't
// stream back to the client the way a Route Handler's Response can.
// Everything up through the automation_requests insert happens
// synchronously here first (auth, validation, rate limit, prompt
// assembly), the same checks runCodeCreatorAction used to make, so a bad
// request still fails fast with a normal status code before any
// streaming begins.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return new Response("You need to be signed in to do this.", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Malformed request body.", { status: 400 });
  }

  const parsed = codeCreatorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Check the requirements for errors", { status: 400 });
  }

  let accountId: string;
  try {
    accountId = await requireAccountId(supabase);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response("You need to be signed in to do this.", { status: 401 });
    }
    throw err;
  }

  try {
    await assertUnderAutomationRateLimit(supabase, accountId);
  } catch (err) {
    if (err instanceof AutomationRateLimitError) {
      return new Response(err.message, { status: 429 });
    }
    throw err;
  }

  // Narrowed once here rather than referenced as user.email below — TS
  // narrowing from the `!user?.email` guard above doesn't persist across
  // the ReadableStream's own nested closure.
  const userId = user.id;
  const userEmail = user.email;

  const { requestId, prompt } = await prepareCodeCreatorRequest(supabase, accountId, { id: userId, email: userEmail }, parsed.data);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let raw = "";
      try {
        for await (const delta of streamCompletion(prompt)) {
          raw += delta;
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "The AI provider call failed.";
        await recordCodeCreatorFailure(supabase, requestId, message);
        controller.error(err instanceof Error ? err : new Error(message));
        return;
      }

      try {
        await finalizeCodeCreatorRequest(supabase, requestId, raw);
        await writeAuditLog(supabase, {
          accountId,
          actorUserId: userId,
          actorEmail: userEmail,
          action: "automation.creator.generate",
          metadata: { scriptType: parsed.data.scriptType, environmentProfile: parsed.data.environmentProfile },
        });
        controller.close();
      } catch (err) {
        // finalizeCodeCreatorRequest already persisted error_message for
        // a CodeCreatorError (malformed output) before throwing — this
        // catch just has to make sure the client's reader sees the
        // failure too, not swallow it.
        controller.error(err instanceof CodeCreatorError ? err : err instanceof Error ? err : new Error("Failed to save the result."));
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
