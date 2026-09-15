import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isRateLimited } from "@/lib/rate-limit/edge";

// Login/signup submit as a POST to their own page (Server Actions), so
// the page path itself is what a rate limiter needs to match — there's no
// separate /api/login endpoint to target.
const RATE_LIMITED_PATHS = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  if (request.method === "POST" && RATE_LIMITED_PATHS.has(request.nextUrl.pathname)) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`${request.nextUrl.pathname}:${ip}`)) {
      return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
