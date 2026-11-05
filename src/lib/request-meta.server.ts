import { getRequest } from "@tanstack/react-start/server";

/**
 * Request header helpers for server function handlers.
 * Load with `await import("./request-meta.server")` inside a handler so
 * `@tanstack/react-start/server` never enters the browser bundle.
 */
export function readClientIp(): string {
  try {
    const h = getRequest().headers;
    const raw =
      h.get("cf-connecting-ip") ||
      h.get("x-forwarded-for")?.split(",")[0] ||
      h.get("x-real-ip") ||
      "";
    return raw.trim();
  } catch {
    return "";
  }
}

export function readTrustedCountry(): string {
  try {
    const headers = getRequest().headers;
    const cloudflareCountry = headers.get("cf-ipcountry")?.trim().toUpperCase() || "";
    if (/^[A-Z]{2}$/.test(cloudflareCountry)) return cloudflareCountry;
    if (process.env["VERCEL"] === "1") {
      const vercelCountry = headers.get("x-vercel-ip-country")?.trim().toUpperCase() || "";
      if (/^[A-Z]{2}$/.test(vercelCountry)) return vercelCountry;
    }
  } catch {
    return "";
  }
  return "";
}

export function readUserAgent(): string {
  try {
    return getRequest().headers.get("user-agent") || "";
  } catch {
    return "";
  }
}

export function readRequestMeta(): { ip?: string; userAgent?: string } {
  try {
    const headers = getRequest().headers;
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      null;
    const userAgent = headers.get("user-agent") || null;
    return { ip: ip ?? undefined, userAgent: userAgent ?? undefined };
  } catch {
    return {};
  }
}
