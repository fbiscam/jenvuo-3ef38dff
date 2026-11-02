// Pure rules for when the dashboard Chat fetches live data before the AI answers:
// Google Maps business leads, a website's real content, or a web search.
import { siteInspectTarget } from "./site-inspect";

export const LEADS_DEFAULT = 20;
export const LEADS_MAX = 60;

const LEADS_RE = /\b(leads?|google ?maps|businesses|business list|companies|shops|stores|clinics|agencies|restaurants)\b/i;
const PLACE_RE = /\b(in|near|around|at)\s+[a-z]/i;
const WEB_RE = /\b(search (the )?(web|internet|online|google)|latest|news about|look up|research|find (info|information|details) (on|about)|what'?s new)\b/i;

export type LeadsAsk = { query: string; count: number; emails: boolean };

/** How many leads the message asks for (default 20, max 60). */
export function leadsCount(text: string): number {
  const m = text.match(/\b(\d{1,3})\b/);
  const n = m ? Number(m[1]) : LEADS_DEFAULT;
  if (!Number.isFinite(n) || n < 1) return LEADS_DEFAULT;
  return Math.min(n, LEADS_MAX);
}

/**
 * Returns a Google Maps search when the user wants leads and names a place;
 * looks at the previous user message too, so "Lahore, 20" after "dentist leads" works.
 */
export function leadsAsk(last: string, previous = ""): LeadsAsk | null {
  const asks = LEADS_RE.test(last);
  const combined = asks ? last : LEADS_RE.test(previous) ? `${previous} in ${last}` : "";
  if (!combined) return null;
  if (!PLACE_RE.test(combined)) return null;
  const query = combined
    .replace(/\b(give|get|find|make|send|create|generate|list|me|please|pls|kindly|of|the|some|from|on|using|with|and|their|a)\b/gi, " ")
    .replace(/\b(google ?maps|leads?|emails?|phone numbers?|websites?|contacts?)\b/gi, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(/[^\p{L}\p{N}\s,&'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(in|near|around|at)\s+/i, "")
    .slice(0, 160);
  if (query.length < 3 || !/[a-z]/i.test(query)) return null;
  return { query, count: leadsCount(combined), emails: /\bemails?\b/i.test(combined) };
}

/** Domain to read with Firecrawl when the user asks about a website / SEO. */
export function websiteAsk(text: string): string | null {
  return siteInspectTarget(text);
}

/** Web search query when the user asks for fresh info from the internet. */
export function webAsk(text: string): string | null {
  if (!WEB_RE.test(text)) return null;
  const q = text.replace(/\s+/g, " ").trim().slice(0, 200);
  return q.length >= 4 ? q : null;
}

/** Pulls unique, plausible email addresses out of page text. */
export function extractEmails(text: string, limit = 3): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi)) {
    const e = m[0].toLowerCase().replace(/\.+$/, "");
    if (/\.(png|jpe?g|gif|svg|webp)$/.test(e) || /example\.|sentry|wixpress|domain\.com/.test(e)) continue;
    out.add(e);
    if (out.size >= limit) break;
  }
  return [...out];
}
