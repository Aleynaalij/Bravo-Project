import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isRateLimited } from "@/lib/rate-limit/edge";

// Login/signup submit as a POST to their own page (Server Actions), so
// the page path itself is what a rate limiter needs to match — there's no
// separate /api/login endpoint to target.
const RATE_LIMITED_PATHS = new Set(["/login", "/signup"]);

// connect-src needs the live Supabase project host plus Sentry's ingest
// hosts (org-specific subdomain, unknown until a real DSN is configured —
// wildcarded rather than hardcoded to one org).
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src 'self';
    connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function proxy(request: NextRequest) {
  if (request.method === "POST" && RATE_LIMITED_PATHS.has(request.nextUrl.pathname)) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`${request.nextUrl.pathname}:${ip}`)) {
      return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });
    }
  }

  // Nonce-based CSP per Next.js's own recipe: written onto the request's
  // own headers (read by updateSession when it builds its NextResponse, and
  // by layout.tsx via next/headers) as well as the response headers, so
  // both the render and the browser see the same value.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
