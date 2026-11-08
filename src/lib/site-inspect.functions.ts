import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { domainAge, isInspectableUrl, topKeywords } from "./site-inspect";

export type SiteReport = {
  domain: string;
  url: string;
  status: number | null;
  ms: number | null;
  https: boolean;
  title: string | null;
  description: string | null;
  h1: string[];
  h2Count: number;
  images: number;
  imagesNoAlt: number;
  links: number;
  canonical: string | null;
  robots: string | null;
  lang: string | null;
  server: string | null;
  created: string | null;
  age: string | null;
  registrar: string | null;
  expires: string | null;
  keywords: { word: string; count: number }[];
  score: number;
  error?: string;
};

const pick = (html: string, re: RegExp) => html.match(re)?.[1]?.trim() ?? null;

export const inspectSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { domain: string }) => {
    const domain = String(d?.domain ?? "").trim().toLowerCase();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,24}$/.test(domain)) throw new Error("Invalid domain");
    return { domain };
  })
  .handler(async ({ data, context }): Promise<SiteReport> => {
    const { domain } = data;
    const url = `https://${domain}`;
    const r: SiteReport = {
      domain, url, status: null, ms: null, https: false, title: null, description: null, h1: [], h2Count: 0,
      images: 0, imagesNoAlt: 0, links: 0, canonical: null, robots: null, lang: null, server: null,
      created: null, age: null, registrar: null, expires: null, keywords: [], score: 0,
    };
    // Same access as Chat itself (ID check + plan entitlement), plus a per-user rate
    // limit, so the inspector can't be used as a free fetch proxy.
    const { idActionBlock } = await import("@/lib/id-gate.server");
    const idBlocked = await idActionBlock(context.userId);
    if (idBlocked) return { ...r, error: idBlocked };
    const { getExtensionEntitlement } = await import("@/lib/extension-billing.server");
    const entitlement = await getExtensionEntitlement(context.userId);
    if (!entitlement.allowed) return { ...r, error: "Your plan doesn't include website reports." };
    const { checkAnalyzeRateLimit } = await import("@/lib/ai-gateway");
    const rl = checkAnalyzeRateLimit(`site-inspect:${context.userId}`);
    if (!rl.allowed) return { ...r, error: `Too many website checks. Please wait ${rl.retryInSec}s.` };
    if (!isInspectableUrl(url)) return { ...r, error: "This website can't be checked." };
    const page = (async () => {
      const t0 = Date.now();
      try {
        // Redirects are followed by hand (max 5) so every hop is checked as a public website.
        let target = url;
        let res: Response | null = null;
        for (let hop = 0; hop <= 5; hop++) {
          if (!isInspectableUrl(target)) throw new Error("blocked");
          res = await fetch(target, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 JenvuInspector" }, signal: AbortSignal.timeout(10000) });
          const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
          if (!loc) break;
          target = new URL(loc, target).toString();
          res = null;
        }
        if (!res) throw new Error("too many redirects");
        Object.defineProperty(res, "url", { value: target, configurable: true });
        r.ms = Date.now() - t0;
        r.status = res.status;
        r.https = res.url.startsWith("https://");
        r.server = res.headers.get("server");
        const html = (await res.text()).slice(0, 800_000);
        r.title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
        r.description = pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) ?? pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
        r.canonical = pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i);
        r.robots = pick(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i);
        r.lang = pick(html, /<html[^>]+lang=["']([^"']*)/i);
        r.h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => (m[1] ?? "").replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 5);
        r.h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
        const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
        r.images = imgs.length;
        r.imagesNoAlt = imgs.filter((i) => !/\balt=["'][^"']+/i.test(i)).length;
        r.links = (html.match(/<a\b[^>]*href=/gi) ?? []).length;
        const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
        r.keywords = topKeywords(text);
      } catch {
        r.error = "The website could not be opened.";
      }
    })();
    const rdap = (async () => {
      try {
        const res = await fetch(`https://rdap.org/domain/${domain}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const j = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[]; entities?: { roles?: string[]; vcardArray?: unknown[] }[] };
        const ev = (a: string) => j.events?.find((e) => e.eventAction === a)?.eventDate ?? null;
        r.created = ev("registration");
        r.expires = ev("expiration");
        if (r.created) r.age = domainAge(new Date(r.created), new Date());
        const reg = j.entities?.find((e) => e.roles?.includes("registrar"));
        const vcard = (reg?.vcardArray?.[1] as unknown[][] | undefined)?.find((v) => v[0] === "fn");
        r.registrar = typeof vcard?.[3] === "string" ? vcard[3] : null;
      } catch { /* domain age unavailable */ }
    })();
    await Promise.all([page, rdap]);
    let s = 0;
    if (r.https) s += 15;
    if (r.title && r.title.length >= 10 && r.title.length <= 65) s += 15; else if (r.title) s += 7;
    if (r.description && r.description.length >= 50 && r.description.length <= 165) s += 15; else if (r.description) s += 7;
    if (r.h1.length === 1) s += 15; else if (r.h1.length) s += 7;
    if (r.canonical) s += 10;
    if (r.lang) s += 5;
    if (r.images === 0 || r.imagesNoAlt / r.images < 0.2) s += 10;
    if (r.ms !== null && r.ms < 1500) s += 15; else if (r.ms !== null && r.ms < 3500) s += 7;
    r.score = r.status ? s : 0;
    return r;
  });
