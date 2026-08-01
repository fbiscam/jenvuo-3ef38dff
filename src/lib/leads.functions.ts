import { createServerFn } from "@tanstack/react-start";

export type Lead = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  mapsUrl: string | null;
  category: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  linkedin?: string | null;
};

const CREDITS_PER_10_LEADS = 1;

function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function searchPlaces(query: string, limit: number, apiKey: string): Promise<Lead[]> {
  const out: Lead[] = [];
  let pageToken: string | undefined;

  while (out.length < limit) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: Math.min(20, limit - out.length) };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "nextPageToken,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Places error ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      places?: Array<Record<string, any>>;
      nextPageToken?: string;
    };
    for (const p of json.places ?? []) {
      out.push({
        name: p.displayName?.text ?? "—",
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        email: null,
        address: p.formattedAddress ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
        reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
        website: p.websiteUri ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        category: p.primaryTypeDisplayName?.text ?? null,
      });
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
    // Places (New) needs a moment before a page token becomes valid.
    await new Promise((r) => setTimeout(r, 1200));
  }

  return out.slice(0, limit);
}

async function enrichWithApollo(leads: Lead[], apiKey: string): Promise<Lead[]> {
  const targets = leads.filter((l) => domainOf(l.website)).slice(0, 25);
  await Promise.all(
    targets.map(async (lead) => {
      const domain = domainOf(lead.website)!;
      try {
        const res = await fetch(
          `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
          { method: "GET", headers: { "x-api-key": apiKey, accept: "application/json" } },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { organization?: Record<string, any> };
        const org = json.organization;
        if (!org) return;
        lead.email = lead.email ?? org.primary_email ?? org.email ?? null;
        lead.linkedin = org.linkedin_url ?? null;
        lead.phone = lead.phone ?? org.primary_phone?.number ?? null;

        if (!lead.email) {
          const pRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
            method: "POST",
            headers: { "x-api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
            body: JSON.stringify({ q_organization_domains: [domain], page: 1, per_page: 1 }),
          });
          if (pRes.ok) {
            const pj = (await pRes.json()) as { people?: Array<Record<string, any>> };
            const person = pj.people?.[0];
            if (person) {
              lead.contactName = person.name ?? null;
              lead.contactTitle = person.title ?? null;
              lead.email = person.email && !String(person.email).includes("not_unlocked") ? person.email : lead.email;
              lead.linkedin = lead.linkedin ?? person.linkedin_url ?? null;
            }
          }
        }
      } catch {
        // enrichment is best-effort
      }
    }),
  );
  return leads;
}

export const runLeadSearch = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; limit?: number; enrich?: boolean }) => data)
  .handler(async ({ data }) => {
    const query = String(data.query ?? "").trim().slice(0, 200);
    const limit = Math.max(1, Math.min(60, Number(data.limit) || 20));
    const enrich = !!data.enrich;
    if (!query) return { ok: false as const, error: "EMPTY_QUERY" };

    const placesKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!placesKey) return { ok: false as const, error: "NOT_CONFIGURED" };

    const { getToolsSession } = await import("./tools-auth.server");
    const { isOpsUnlocked } = await import("./admin-guard.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const session = await getToolsSession();
    const toolUserId = session.data.toolUserId ?? null;
    const ops = toolUserId ? false : await isOpsUnlocked();
    if (!toolUserId && !ops) return { ok: false as const, error: "UNAUTHORIZED" };

    const cost = Math.ceil(limit / 10) * CREDITS_PER_10_LEADS;

    let credits = Infinity;
    if (toolUserId) {
      const { data: u } = await supabaseAdmin
        .from("tool_users")
        .select("credits, active")
        .eq("id", toolUserId)
        .maybeSingle();
      if (!u || !u.active) return { ok: false as const, error: "UNAUTHORIZED" };
      credits = Number(u.credits);
      if (credits < cost) return { ok: false as const, error: "INSUFFICIENT_CREDITS", needed: cost, credits };
    }

    let leads: Lead[];
    try {
      leads = await searchPlaces(query, limit, placesKey);
    } catch (e) {
      return { ok: false as const, error: "PROVIDER_ERROR", message: e instanceof Error ? e.message : String(e) };
    }

    const apolloKey = process.env.APOLLO_API_KEY;
    if (enrich && apolloKey && leads.length) {
      leads = await enrichWithApollo(leads, apolloKey);
    }

    const actualCost = toolUserId ? Math.ceil(Math.max(leads.length, 1) / 10) * CREDITS_PER_10_LEADS : 0;
    let balance = credits;
    if (toolUserId && actualCost > 0) {
      balance = Math.max(0, credits - actualCost);
      await supabaseAdmin.from("tool_users").update({ credits: balance }).eq("id", toolUserId);
      await supabaseAdmin.from("tool_user_credit_log").insert({
        tool_user_id: toolUserId,
        delta: -actualCost,
        reason: "lead_search",
        balance_after: balance,
        metadata: { query, results: leads.length },
      });
    }

    await supabaseAdmin.from("tool_lead_searches").insert({
      tool_user_id: toolUserId,
      query,
      results_count: leads.length,
      credits_spent: actualCost,
      enriched: enrich && !!apolloKey,
    });

    return {
      ok: true as const,
      leads,
      creditsSpent: actualCost,
      balance: Number.isFinite(balance) ? balance : null,
      enriched: enrich && !!apolloKey,
    };
  });

export const listLeadHistory = createServerFn({ method: "POST" }).handler(async () => {
  const { getToolsSession } = await import("./tools-auth.server");
  const { isOpsUnlocked } = await import("./admin-guard.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const session = await getToolsSession();
  const toolUserId = session.data.toolUserId ?? null;
  if (!toolUserId && !(await isOpsUnlocked())) return { ok: false as const, rows: [] };

  let q = supabaseAdmin
    .from("tool_lead_searches")
    .select("id, query, results_count, credits_spent, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  if (toolUserId) q = q.eq("tool_user_id", toolUserId);

  const { data } = await q;
  return { ok: true as const, rows: data ?? [] };
});
