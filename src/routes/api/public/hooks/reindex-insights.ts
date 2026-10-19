import { createFileRoute } from "@tanstack/react-router";
import { submitToGoogle, submitToIndexNow } from "./generate-insight";

const BASE_URL = "https://blogs.jenvu.com";

async function handle(request: Request) {
  const { isAuthorizedCronRequest, cronUnauthorized } = await import("@/lib/cron-guard.server");
  if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized();

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let q = supabaseAdmin
    .from("insights")
    .select("id, slug, indexed_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (!force) q = q.is("indexed_at", null);
  const { data: rows, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const items = rows ?? [];
  if (!items.length) return Response.json({ ok: true, count: 0, note: "nothing-to-index" });

  const urls = items.map((r) => `${BASE_URL}/${r.slug}`);
  const indexnow = await submitToIndexNow(urls);

  // One sitemap resubmission covers every article (the sitemap lists them all).
  const google = await submitToGoogle();
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("insights")
    .update({ indexed_at: now, index_status: { google, indexnow } })
    .in("id", items.map((r) => r.id));

  return Response.json({ ok: true, count: items.length, indexnow, google });
}

export const Route = createFileRoute("/api/public/hooks/reindex-insights")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
