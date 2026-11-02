// Live data for the dashboard Chat: Google Maps leads, website content and web
// search via the Lovable connectors. Only called from the signed-in, paid Chat.
import { extractEmails, leadsAsk, webAsk, websiteAsk } from "./chat-live-data";

const MAPS = "https://connector-gateway.lovable.dev/google_maps";
const FIRECRAWL = "https://connector-gateway.lovable.dev/firecrawl/v2";

type Lead = {
  name: string; category: string; address: string; phone: string; website: string;
  rating: number | null; reviews: number | null; maps: string; status: string; emails?: string[];
};

function keys(name: "GOOGLE_MAPS_API_KEY" | "FIRECRAWL_API_KEY") {
  const lk = process.env["LOVABLE_API_KEY"];
  const ck = process.env[name];
  return lk && ck ? { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck } : null;
}

async function firecrawl(path: string, body: unknown, ms = 20000): Promise<Record<string, unknown> | null> {
  const h = keys("FIRECRAWL_API_KEY");
  if (!h) return null;
  const r = await fetch(`${FIRECRAWL}/${path}`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) {
    console.error(`[chat-live] firecrawl ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return null;
  }
  return (await r.json()) as Record<string, unknown>;
}

async function mapsLeads(query: string, count: number): Promise<{ leads: Lead[]; error?: string }> {
  const h = keys("GOOGLE_MAPS_API_KEY");
  if (!h) return { leads: [], error: "Google Maps is not connected." };
  const leads: Lead[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3 && leads.length < count; page++) {
    const r = await fetch(`${MAPS}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,places.businessStatus,nextPageToken",
      },
      body: JSON.stringify({ textQuery: query, pageSize: Math.min(20, count - leads.length), ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error(`[chat-live] maps ${r.status}: ${body.slice(0, 300)}`);
      return { leads, error: leads.length ? undefined : `Google Maps search failed (${r.status}).` };
    }
    const j = (await r.json()) as { places?: Record<string, any>[]; nextPageToken?: string };
    for (const p of j.places ?? []) {
      leads.push({
        name: p.displayName?.text ?? "",
        category: p.primaryTypeDisplayName?.text ?? "",
        address: p.formattedAddress ?? "",
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? "",
        website: p.websiteUri ?? "",
        rating: typeof p.rating === "number" ? p.rating : null,
        reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
        maps: p.googleMapsUri ?? "",
        status: p.businessStatus ?? "",
      });
    }
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return { leads: leads.slice(0, count) };
}

/** Reads up to 6 lead websites (3 at a time; Firecrawl allows ~10 requests a minute) for public email addresses. */
async function addEmails(leads: Lead[]) {
  const withSite = leads.filter((l) => l.website).slice(0, 6);
  for (let i = 0; i < withSite.length; i += 3) {
    await Promise.all(withSite.slice(i, i + 3).map(async (l) => {
      try {
        const j = await firecrawl("scrape", { url: l.website, formats: ["markdown", "links"], onlyMainContent: false }, 15000);
        const d = (j?.data ?? j) as { markdown?: string; links?: string[] } | undefined;
        l.emails = extractEmails(`${d?.markdown ?? ""} ${(d?.links ?? []).join(" ")}`);
      } catch { /* site unreadable */ }
    }));
  }
}

function leadsBlock(query: string, leads: Lead[], emails: boolean) {
  const rows = leads.map((l, i) =>
    [i + 1, l.name, l.category, l.address, l.phone || "-", l.website || "-", l.rating ?? "-", l.reviews ?? "-", ...(emails ? [l.emails?.join(", ") || "-"] : []), l.maps || "-"].join(" | "),
  );
  return [
    `[Live Google Maps data fetched just now for "${query}" — ${leads.length} businesses]`,
    `# | Business | Category | Address | Phone | Website | Rating | Reviews${emails ? " | Emails (from their website)" : ""} | Maps link`,
    ...rows,
    "Build the leads document ONLY from these rows. Keep every value exactly as given, never add businesses, phones, emails or websites that are not listed; '-' means not listed on Google Maps.",
  ].join("\n");
}

async function websiteBlock(domain: string) {
  const j = await firecrawl("scrape", { url: `https://${domain}`, formats: ["markdown", "links"], onlyMainContent: false });
  if (!j) return null;
  const d = (j.data ?? j) as { markdown?: string; links?: string[]; metadata?: Record<string, unknown> };
  const md = (d.markdown ?? "").slice(0, 7000);
  if (!md) return null;
  const meta = d.metadata ?? {};
  const internal = (d.links ?? []).filter((u) => u.includes(domain)).length;
  return [
    `[Live content of https://${domain} read just now]`,
    `Title: ${String(meta["title"] ?? "-")}`,
    `Description: ${String(meta["description"] ?? "-")}`,
    `Language: ${String(meta["language"] ?? "-")} · Status: ${String(meta["statusCode"] ?? "-")} · Links: ${(d.links ?? []).length} (${internal} internal)`,
    `Emails on page: ${extractEmails(`${md} ${(d.links ?? []).join(" ")}`, 5).join(", ") || "-"}`,
    "Page text:",
    md,
    "Use this real content for the website / SEO report; do not invent pages, numbers or rankings you cannot see here.",
  ].join("\n");
}

async function webBlock(query: string) {
  const j = await firecrawl("search", { query, limit: 5, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }, 25000);
  if (!j) return null;
  const raw = (Array.isArray(j.data) ? j.data : (j.data as { web?: unknown[] } | undefined)?.web ?? []) as { url?: string; title?: string; description?: string; markdown?: string }[];
  const hits = raw.filter((x) => x.url).slice(0, 5);
  if (!hits.length) return null;
  return [
    `[Live web results for "${query}" fetched just now]`,
    ...hits.map((h, i) => `${i + 1}. ${h.title ?? h.url} — ${h.url}\n${(h.description ?? "").slice(0, 300)}\n${(h.markdown ?? "").slice(0, 1500)}`),
    "Answer from these results and cite the links you used.",
  ].join("\n\n");
}

/** Returns a context block with real data for the latest message, or null. */
export async function liveDataFor(last: string, previous: string): Promise<{ block: string; source: string } | null> {
  try {
    const lead = leadsAsk(last, previous);
    if (lead) {
      const { leads, error } = await mapsLeads(lead.query, lead.count);
      if (!leads.length) {
        return { source: "maps", block: `[Google Maps search for "${lead.query}" returned no businesses${error ? `: ${error}` : ""}. Tell the user plainly and suggest a different keyword or city. Do not invent businesses.]` };
      }
      if (lead.emails) await addEmails(leads);
      return { source: "maps", block: leadsBlock(lead.query, leads, lead.emails) };
    }
    const domain = websiteAsk(last);
    if (domain) {
      const block = await websiteBlock(domain);
      return block ? { source: "website", block } : null;
    }
    const q = webAsk(last);
    if (q) {
      const block = await webBlock(q);
      return block ? { source: "web", block } : null;
    }
  } catch (e) {
    console.error("[chat-live]", e);
  }
  return null;
}
