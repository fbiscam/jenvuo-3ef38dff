import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://jenvu.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/app", changefreq: "weekly", priority: "0.9" },
          { path: "/signal", changefreq: "daily", priority: "0.9" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
          { path: "/download", changefreq: "weekly", priority: "0.8" },
          { path: "/pricing", changefreq: "weekly", priority: "0.9" },
          { path: "/insights", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/ai-engine", changefreq: "monthly", priority: "0.7" },
          { path: "/llm", changefreq: "monthly", priority: "0.6" },
          { path: "/development", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
          { path: "/help", changefreq: "weekly", priority: "0.6" },
        ];

        // Append Help Center pages
        try {
          const { collections } = await import("@/lib/help-content");
          for (const c of collections) {
            entries.push({ path: `/help/${c.slug}`, changefreq: "monthly", priority: "0.5" });
            for (const a of c.articles) {
              entries.push({
                path: `/help/${c.slug}/${a.slug}`,
                changefreq: "monthly",
                priority: "0.5",
                lastmod: a.updatedAt,
              });
            }
          }
        } catch {
          // ignore
        }


        // Append every published insight
        try {
          const supa = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data: posts } = await supa
            .from("insights")
            .select("slug, published_at")
            .order("published_at", { ascending: false })
            .limit(1000);
          for (const p of posts ?? []) {
            entries.push({
              path: `/insights/${p.slug}`,
              changefreq: "weekly",
              priority: "0.7",
              lastmod: new Date(p.published_at).toISOString().slice(0, 10),
            });
          }
        } catch {
          // ignore — sitemap still serves with static routes
        }

        const today = new Date().toISOString().slice(0, 10);
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <lastmod>${e.lastmod ?? today}</lastmod>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
