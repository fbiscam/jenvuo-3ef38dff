import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://jenvu.com";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function submitToGoogle(url: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) return { ok: false, skipped: true };
  try {
    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_search_console/indexing/v3/urlNotifications:publish",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, type: "URL_UPDATED" }),
      },
    );
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export const Route = createFileRoute("/api/public/hooks/generate-insight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
          return new Response(JSON.stringify({ error: "CRON_SECRET missing" }), { status: 500 });
        }
        const provided = request.headers.get("x-cron-secret") || "";
        if (provided !== cronSecret) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Daily cap: 2 articles in last 24h
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count: recentCount } = await supabaseAdmin
          .from("insights")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since);
        if ((recentCount ?? 0) >= 2) {
          return Response.json({ skipped: "daily-cap-reached", recentCount });
        }

        // Pick a topic not used in 30 days (or never used), highest priority first
        const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const { data: topics, error: topicErr } = await supabaseAdmin
          .from("insight_topics")
          .select("*")
          .or(`last_used_at.is.null,last_used_at.lt.${cutoff}`)
          .order("priority", { ascending: false })
          .order("last_used_at", { ascending: true, nullsFirst: true })
          .limit(1);

        if (topicErr) return new Response(JSON.stringify({ error: topicErr.message }), { status: 500 });
        if (!topics || topics.length === 0) {
          return Response.json({ skipped: "no-topic-available" });
        }
        const topic = topics[0];

        // Call Lovable AI for a structured article
        const sys = `You are a senior institutional trading analyst writing for Jenvu — an AI gold trading terminal. Write a comprehensive, factually accurate, SEO-optimized markdown article. Style: precise, professional, no fluff, no hype, no emojis. Use ICT/SMC concepts correctly. Include H2/H3 headings, bullet lists where useful, a short FAQ section at the end with 3 Q&A pairs. 900-1300 words.`;

        const userPrompt = `Write a complete article on: "${topic.keyword}"
Angle: ${topic.angle || "comprehensive guide"}
Category: ${topic.category}

Return STRICT JSON only, no prose, with this exact shape:
{
  "title": "<60-char SEO title with the primary keyword>",
  "slug": "<url-safe-slug>",
  "excerpt": "<150-160 char meta description with primary keyword>",
  "content": "<full markdown article 900-1300 words with ## H2 sections, lists, and a final ## FAQ section. Use internal links to /signal, /app, /insights, /download where natural>"
}`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!aiRes.ok) {
          const txt = await aiRes.text();
          return new Response(JSON.stringify({ error: "ai-failed", status: aiRes.status, body: txt.slice(0, 400) }), { status: 502 });
        }

        const ai = await aiRes.json();
        const raw = ai?.choices?.[0]?.message?.content ?? "{}";
        let parsed: { title?: string; slug?: string; excerpt?: string; content?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response(JSON.stringify({ error: "ai-bad-json", raw: raw.slice(0, 400) }), { status: 502 });
        }

        const title = (parsed.title || topic.keyword).slice(0, 120);
        const slug = slugify(parsed.slug || title);
        const excerpt = (parsed.excerpt || "").slice(0, 250) || `${topic.keyword} — institutional analysis from Jenvu.`;
        const content = parsed.content || "";

        if (!content || content.length < 800) {
          return new Response(JSON.stringify({ error: "content-too-short", len: content.length }), { status: 502 });
        }

        // Dedupe by slug
        const { data: existing } = await supabaseAdmin
          .from("insights")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin.from("insight_topics").update({ last_used_at: new Date().toISOString() }).eq("id", topic.id);
          return Response.json({ skipped: "duplicate-slug", slug });
        }

        const stockImages = [
          "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1600&q=80",
          "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80",
          "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1600&q=80",
          "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&q=80",
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1600&q=80",
          "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=1600&q=80",
          "https://images.unsplash.com/photo-1620266757065-5814239881fd?w=1600&q=80",
        ];
        const image_url = stockImages[Math.floor(Math.random() * stockImages.length)];

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("insights")
          .insert({
            title,
            slug,
            excerpt,
            content,
            category: topic.category,
            image_url,
            published_at: new Date().toISOString(),
          })
          .select("id, slug")
          .single();

        if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });

        await supabaseAdmin.from("insight_topics").update({ last_used_at: new Date().toISOString() }).eq("id", topic.id);

        // Submit to Google indexing (best-effort, non-blocking on failure)
        const url = `${BASE_URL}/insights/${slug}`;
        const index = await submitToGoogle(url);

        return Response.json({ ok: true, slug, url, index });
      },
    },
  },
});
