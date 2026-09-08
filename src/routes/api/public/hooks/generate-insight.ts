import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://jenvu.com";
const INDEXNOW_KEY = "31f95befb924351f7ab6c1f5ce4bc15b";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function submitToGoogle(url: string) {
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

export async function submitToIndexNow(urls: string[]) {
  if (!urls.length) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "jenvu.com",
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
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


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Daily cap: 1 article per 24h (bypass with ?force=1 for manual publishing)
        const force = new URL(request.url).searchParams.get("force") === "1";
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count: recentCount } = await supabaseAdmin
          .from("insights")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since);
        if (!force && (recentCount ?? 0) >= 1) {
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

        // Article prompt — Europe-focused SEO to grow EU organic traffic
        // Optional language directive stored on the topic angle, e.g. "LANG:de | goldpreis outlook"
        const langMatch = /LANG:([a-z]{2})/i.exec(topic.angle || "");
        const langCode = (langMatch?.[1] || "en").toLowerCase();
        const langNames: Record<string, string> = {
          en: "British English",
          de: "German (Germany)",
          fr: "French (France)",
          es: "Spanish (Spain)",
          it: "Italian (Italy)",
          nl: "Dutch (Netherlands)",
          pl: "Polish (Poland)",
        };
        const langName = langNames[langCode] || "British English";

        const sys = `You are a senior institutional trading analyst writing for Jenvu — an AI gold trading terminal. Write a comprehensive, factually accurate, SEO-optimized markdown article targeted at European retail and prop-firm traders (UK, Germany, France, Italy, Spain, Netherlands, Poland, Switzerland). Write the ENTIRE article, title, slug and excerpt in ${langName}. Target the primary keyword exactly as given plus its natural long-tail and question variants, and weave in high-intent European search terms (London killzone, Frankfurt open, XAU/EUR, XAU/GBP, London session gold, prop firm challenge, MT5 gold signals, ICT concepts, smart money concepts) without keyword stuffing. Cover gold, crypto and macro/news angles accurately when the topic calls for them, and reference European market hours, regulation (FCA, BaFin, ESMA/MiCA) and EUR/GBP pricing where relevant. Style: precise, professional, no fluff, no hype, no emojis, no invented statistics, prices, testimonials or guarantees — describe drivers and method instead of quoting live numbers. Use ICT/SMC concepts correctly. Include H2/H3 headings, bullet lists or a comparison table where they answer better than prose, and a final FAQ section with 3 Q&A pairs answering long-tail European queries. 900-1300 words.`;

        const userPrompt = `Write a complete article on: "${topic.keyword}"
Angle: ${topic.angle || "comprehensive guide"}
Category: ${topic.category}
Language: ${langName}
Primary keyword must appear in the title, the first 100 words, and at least one H2.

Return STRICT JSON only, no prose, with this exact shape:
{
  "title": "<60-char SEO title with the primary keyword, optimized for Google Europe SERPs>",
  "slug": "<url-safe-slug, always lowercase ascii>",
  "excerpt": "<150-160 char meta description with primary keyword and a European trading hook>",
  "content": "<full markdown article 900-1300 words with ## H2 sections, lists, and a final ## FAQ section. Use internal links to /signal, /app, /insights, /download where natural>"
}`;


        // Try Bluesminds first (when configured), then fall back to Lovable AI
        // models so a provider outage never leaves the Insights section stale.
        const { callChatCompletion } = await import("@/lib/ai-gateway");
        const chain = [
          "bmind/gpt-4o",
          "bmind/gpt-5.5",
          "bmind/gpt-oss-20b",
          "google/gemini-3.8-flash",
          "openai/gpt-5.4-mini",
          "google/gemini-3.1-flash-lite",
        ];

        let raw = "";
        let lastErr = "";
        try {
          const out = await callChatCompletion({
            models: chain,
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userPrompt },
            ],
            jsonMode: true,
            timeoutMs: 90_000,
            deadlineMs: 240_000,
            retriesPerModel: 2,
            stage: "generate-insight",
          });
          raw = out.content ?? "";
        } catch (e) {
          lastErr = String((e as Error)?.message ?? e);
          console.error("[generate-insight] all providers failed", lastErr);
        }

        if (!raw.trim()) {
          // Do not write an article. Next cron run will retry.
          return Response.json({ skipped: "ai-unavailable", detail: lastErr, willRetry: true });
        }

        // Some providers wrap JSON in ```json fences — strip them.
        raw = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        let parsed: { title?: string; slug?: string; excerpt?: string; content?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          // Try to extract the first {...} block
          const m = raw.match(/\{[\s\S]*\}/);
          if (!m) {
            return new Response(JSON.stringify({ error: "ai-bad-json", raw: raw.slice(0, 400) }), { status: 502 });
          }
          try { parsed = JSON.parse(m[0]); } catch {
            return new Response(JSON.stringify({ error: "ai-bad-json", raw: raw.slice(0, 400) }), { status: 502 });
          }
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

        // AI-generated cover image (Bluesminds writes the text; the image comes
        // from Lovable AI's image model since Bluesminds has no image model).
        const { generateInsightCover } = await import("@/lib/insight-image.server");
        const image_url =
          (await generateInsightCover({ title, category: topic.category, slug })) ??
          "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&q=80";

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

        // Submit to search engines (Google indexing API + IndexNow → Bing/Yandex)
        const url = `${BASE_URL}/insights/${slug}`;
        const [google, indexnow] = await Promise.all([
          submitToGoogle(url),
          submitToIndexNow([url, `${BASE_URL}/insights`, `${BASE_URL}/sitemap.xml`]),
        ]);

        await supabaseAdmin
          .from("insights")
          .update({ indexed_at: new Date().toISOString(), index_status: { google, indexnow } })
          .eq("id", inserted!.id);

        return Response.json({ ok: true, slug, url, google, indexnow });
      },
    },
  },
});
