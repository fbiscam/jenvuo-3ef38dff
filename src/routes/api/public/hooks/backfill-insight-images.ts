import { createFileRoute } from "@tanstack/react-router";

// Generates AI cover images for insights that have no image (or still use a
// stock photo). Protected by the cron secret; processes a small batch per call.
export const Route = createFileRoute("/api/public/hooks/backfill-insight-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest, cronUnauthorized } = await import("@/lib/cron-guard.server");
        if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized();

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 3), 8);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { generateInsightCover } = await import("@/lib/insight-image.server");

        const { data: rows, error } = await supabaseAdmin
          .from("insights")
          .select("id, title, slug, category, image_url")
          .order("published_at", { ascending: false })
          .limit(200);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const pending = (rows ?? [])
          .filter((r) => !r.image_url || !r.image_url.includes("/api/public/insight-image/"))
          .slice(0, limit);

        const results: Array<{ slug: string; ok: boolean }> = [];
        for (const row of pending) {
          const image_url = await generateInsightCover({
            title: row.title,
            category: row.category,
            slug: row.slug,
          });
          if (image_url) {
            await supabaseAdmin.from("insights").update({ image_url }).eq("id", row.id);
          }
          results.push({ slug: row.slug, ok: Boolean(image_url) });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
