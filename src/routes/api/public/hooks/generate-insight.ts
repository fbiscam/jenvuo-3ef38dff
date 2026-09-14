import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://jenvu.com";
const INDEXNOW_KEY = "31f95befb924351f7ab6c1f5ce4bc15b";
const JOB_KEY = "daily-insight";
const ARTICLE_MODELS = [
  "unorouter/nemotron-3-ultra-550b-a55b:free",
  "unorouter/glm-5.3:free",
  "bmind/meta/llama-3.2-11b-vision-instruct",
];
const ARTICLE_MODEL_LABEL = "UnoRouter Nemotron Ultra (free)";

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

        const { data: currentJob } = await supabaseAdmin
          .from("insight_generation_jobs")
          .select("status, pause_reason")
          .eq("job_key", JOB_KEY)
          .maybeSingle();

        if (currentJob?.status === "paused") {
          try {
            const { callChatCompletion } = await import("@/lib/ai-gateway");
            await callChatCompletion({ models: ARTICLE_MODELS, messages: [{ role: "user", content: "Reply exactly READY" }], maxTokens: 16, retriesPerModel: 1, stage: "insight-health-probe" });
            await supabaseAdmin
              .from("insight_generation_jobs")
              .update({ status: "idle", pause_reason: null, last_error: null, updated_at: new Date().toISOString() })
              .eq("job_key", JOB_KEY);
            return Response.json({ recovered: true, note: "Generation will resume on the next daily run." });
          } catch (error) {
            return Response.json({ paused: true, reason: currentJob.pause_reason, probe: String(error) });
          }
        }

        const { data: lockedJob, error: lockError } = await supabaseAdmin.rpc("acquire_insight_generation_job", {
          _job_key: JOB_KEY,
          _lease_seconds: 1800,
        });
        if (lockError) return Response.json({ error: lockError.message }, { status: 500 });
        if (!lockedJob) return Response.json({ skipped: "already-running" });

        const updateJob = async (values: Record<string, unknown>) => {
          await supabaseAdmin
            .from("insight_generation_jobs")
            .update({ ...values, locked_until: null, updated_at: new Date().toISOString() })
            .eq("job_key", JOB_KEY);
        };

        // Daily cap: 1 article per 24h (bypass with ?force=1 for manual publishing)
        const force = new URL(request.url).searchParams.get("force") === "1";
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count: recentCount } = await supabaseAdmin
          .from("insights")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since);
        if (!force && (recentCount ?? 0) >= 1) {
          await updateJob({ status: "completed", last_completed_at: new Date().toISOString() });
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
          await updateJob({ status: "completed", last_completed_at: new Date().toISOString() });
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

Return Markdown only. Start with one '# ' title of no more than 60 characters, then the complete 900-1300 word article. Use ## H2 sections, lists, a final ## FAQ section, and natural internal links to /signal, /app, /insights, or /download. Do not wrap the Markdown in a code fence.`;


        let raw = "";
        let lastErr = "";
        try {
          const sectionPrompts = [
            `${userPrompt}\n\nWrite part 1 of 3 only: the title, introduction, and first two substantive H2 sections. Aim for 350-450 words.`,
            `Continue the same article on "${topic.keyword}" in ${langName}. Write part 2 of 3 only: three new substantive H2 sections covering practical method, European sessions, and risk. Do not repeat the title or introduction. Aim for 350-450 words.`,
            `Finish the same article on "${topic.keyword}" in ${langName}. Write part 3 of 3 only: key takeaways, a concise conclusion, and a final ## FAQ with exactly 3 useful Q&A pairs. Do not repeat earlier sections. Aim for 300-400 words.`,
          ];
          const parts: string[] = [];
          for (const prompt of sectionPrompts) {
            parts.push(
              (await (await import("@/lib/ai-gateway")).callChatCompletion({
                models: ARTICLE_MODELS,
                messages: [
                  { role: "system", content: sys },
                  { role: "user", content: prompt },
                ],
                maxTokens: 1800,
                retriesPerModel: 1,
                timeoutMs: 120_000,
                deadlineMs: 300_000,
                stage: "daily-insight",
              })).content,
            );
          }
          raw = parts.join("\n\n");
        } catch (e) {
          lastErr = String((e as Error)?.message ?? e);
          console.error("[generate-insight] all providers failed", lastErr);
          const status = typeof e === "object" && e !== null && "status" in e ? Number(e.status) : 0;
          const shouldPause = status === 401 || status === 402 || status === 403;
          await updateJob({
            status: shouldPause ? "paused" : "failed",
            pause_reason: shouldPause ? `provider-${status}` : null,
            last_error: lastErr,
            last_model: ARTICLE_MODEL_LABEL,
            last_topic_id: topic.id,
            consecutive_rate_limits: status === 429 ? 1 : 0,
          });
        }

        if (!raw.trim()) {
          // Do not write an article. Next cron run will retry.
          return Response.json({ skipped: "ai-unavailable", detail: lastErr, willRetry: true });
        }

        const markdown = raw.trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/i, "").trim();
        const titleMatch = markdown.match(/^#\s+(.+)$/m);
        const title = (titleMatch?.[1]?.trim() || topic.keyword).slice(0, 120);
        const slug = slugify(title);
        const content = markdown.replace(/^#\s+.+\n?/, "").trim();
        const firstParagraph = content
          .split(/\n\s*\n/)
          .find((part) => part.trim() && !part.trim().startsWith("#") && !part.trim().startsWith("-") && !part.trim().startsWith("|"));
        const cleanParagraph = (firstParagraph || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
        const excerpt = cleanParagraph
          ? `${cleanParagraph.slice(0, 157).trimEnd()}${cleanParagraph.length > 157 ? "…" : ""}`
          : `${topic.keyword} — institutional analysis from Jenvu.`;

        if (!content || content.length < 800) {
          await updateJob({
            status: "failed",
            last_error: `Article content was too short (${content.length} characters).`,
            last_model: ARTICLE_MODEL_LABEL,
            last_topic_id: topic.id,
          });
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

        // Generate the cover through UnoRouter's free image tier first, then
        // continue through the existing reliable image fallbacks.
        const { generateInsightCover, InsightImageGenerationError } = await import("@/lib/insight-image.server");
        let image_url: string | null = null;
        try {
          image_url = await generateInsightCover({ title, category: topic.category, slug });
        } catch (error) {
          const status = error instanceof InsightImageGenerationError ? error.status : 0;
          const shouldPause = status === 402 || status === 403;
          await updateJob({
            status: shouldPause ? "paused" : "failed",
            pause_reason: shouldPause ? `image-provider-${status}` : null,
            last_error: String(error),
            last_model: ARTICLE_MODEL_LABEL,
            last_topic_id: topic.id,
          });
          return Response.json(
            { error: "image-generation-failed", published: false, paused: shouldPause },
            { status: shouldPause ? status : 502 },
          );
        }
        if (!image_url) {
          await updateJob({
            status: "failed",
            last_error: "Cover image generation failed; article was not published.",
            last_model: ARTICLE_MODEL_LABEL,
            last_topic_id: topic.id,
          });
          return Response.json({ error: "image-generation-failed", published: false }, { status: 502 });
        }

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

        if (insErr) {
          await updateJob({ status: "failed", last_error: insErr.message, last_model: ARTICLE_MODEL_LABEL, last_topic_id: topic.id });
          return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });
        }

        await supabaseAdmin.from("insight_topics").update({ last_used_at: new Date().toISOString() }).eq("id", topic.id);

        // Submit to search engines (Google indexing API + IndexNow → Bing/Yandex)
        const url = `${BASE_URL}/insights/${slug}`;
        const [google, indexnow] = await Promise.all([
          submitToGoogle(url),
          submitToIndexNow([url, `${BASE_URL}/insights`, `${BASE_URL}/sitemap.xml`]),
        ]);

        if (!inserted) {
          await updateJob({ status: "failed", last_error: "Article insert returned no row." });
          return Response.json({ error: "missing-insert-result" }, { status: 500 });
        }

        const indexStatus = { google, indexnow };
        await supabaseAdmin
          .from("insights")
          .update({ indexed_at: new Date().toISOString(), index_status: indexStatus })
          .eq("id", inserted.id);

        await updateJob({
          status: "completed",
          last_completed_at: new Date().toISOString(),
          last_model: ARTICLE_MODEL_LABEL,
          last_topic_id: topic.id,
          last_insight_id: inserted.id,
          last_index_status: indexStatus,
          last_error: null,
          pause_reason: null,
          consecutive_rate_limits: 0,
        });

        return Response.json({ ok: true, slug, url, model: ARTICLE_MODEL_LABEL, google, indexnow });
      },
    },
  },
});
