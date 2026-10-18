import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SearchHit = { title: string; url: string; path: string[]; description: string; source: "jenvu" | "web" };
export type SearchResult = { hits: SearchHit[]; webError?: string };

const Input = z.object({ q: z.string().trim().min(1).max(200) });

export const siteSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<SearchResult> => {
    const { collections } = await import("@/lib/help-content");
    const { STORIES } = await import("@/lib/stories");
    const words = data.q.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !["what", "the", "how", "jenvu", "and", "for", "does"].includes(w));
    const aboutJenvu = /jenvu/i.test(data.q);

    const score = (t: string) => {
      const s = t.toLowerCase();
      return words.reduce((n, w) => n + (s.includes(w) ? 1 : 0), 0);
    };
    const local: (SearchHit & { s: number })[] = [];
    for (const c of collections) for (const a of c.articles) {
      const s = score(a.title) * 3 + score(a.summary);
      if (s > 0 || (aboutJenvu && words.length === 0)) local.push({ s, title: a.title, url: `/help/${c.slug}/${a.slug}`, path: ["help", c.slug, a.slug], description: a.summary, source: "jenvu" });
    }
    for (const st of STORIES) {
      const s = score(st.title) * 3 + score(st.intro);
      if (s > 0) local.push({ s, title: st.title, url: `/stories/${st.slug}`, path: ["stories", st.slug], description: st.intro, source: "jenvu" });
    }
    local.sort((a, b) => b.s - a.s);
    const jenvu = local.slice(0, aboutJenvu ? 8 : 4).map(({ s: _s, ...h }) => h);

    let web: SearchHit[] = [];
    let webError: string | undefined;
    const lk = process.env["LOVABLE_API_KEY"];
    const fk = process.env["FIRECRAWL_API_KEY"];
    if (!lk || !fk) webError = "Web results are not configured.";
    else {
      try {
        const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": fk },
          body: JSON.stringify({ query: data.q, limit: 8 }),
        });
        if (!r.ok) {
          console.error(`[site-search] ${r.status}: ${await r.text()}`);
          webError = "Web results are unavailable right now.";
        } else {
          const j = (await r.json()) as { data?: { web?: unknown[] } | unknown[] };
          const raw = (Array.isArray(j.data) ? j.data : j.data?.web ?? []) as { url?: string; title?: string; description?: string }[];
          web = raw.filter((x) => x.url).map((x) => {
            const u = new URL(x.url!);
            return { title: x.title || u.hostname, url: x.url!, path: [u.hostname.replace(/^www\./, ""), ...u.pathname.split("/").filter(Boolean).slice(0, 2)], description: x.description || "", source: "web" as const };
          });
        }
      } catch (e) {
        console.error("[site-search]", e);
        webError = "Web results are unavailable right now.";
      }
    }
    return { hits: aboutJenvu ? [...jenvu, ...web] : [...jenvu.slice(0, 2), ...web, ...jenvu.slice(2)], webError };
  });
