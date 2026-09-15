// Fetches branding.logo_url server-side so the DOCX builder can embed it as
// a raw buffer (docx's ImageRun has no "just give it a URL" option — see
// docx.ts) and so the PDF/PPTX builders can embed the exact same bytes
// instead of letting their own libraries re-fetch the URL a second time.
//
// logo_url is account-owner-supplied and this fetch runs on the server, so
// it's a textbook SSRF surface: https-only blocks the common case of an
// attacker pointing it at a plain-HTTP internal/metadata endpoint, the
// content-type allowlist keeps this from being usable as a generic URL-
// fetch oracle, and the byte cap bounds the damage from a slow/huge
// response.
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const CONTENT_TYPE_TO_DOCX_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
} as const;

export type LogoContentType = keyof typeof CONTENT_TYPE_TO_DOCX_TYPE;

export interface LogoAsset {
  buffer: Buffer;
  contentType: LogoContentType;
  docxType: (typeof CONTENT_TYPE_TO_DOCX_TYPE)[LogoContentType];
}

export function isSafeLogoUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchLogoAsset(url: string): Promise<LogoAsset | null> {
  if (!isSafeLogoUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) return null;

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase() as LogoContentType | undefined;
    if (!contentType || !(contentType in CONTENT_TYPE_TO_DOCX_TYPE)) return null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_LOGO_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    return { buffer: Buffer.concat(chunks), contentType, docxType: CONTENT_TYPE_TO_DOCX_TYPE[contentType] };
  } catch {
    // Unreachable host, timeout, TLS failure, etc. — a bad logo URL should
    // never take down the whole export, so every failure just means "skip
    // the logo," never a thrown error.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
