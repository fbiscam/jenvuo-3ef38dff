import { createFileRoute } from "@tanstack/react-router";

// Generates AI cover images for insights that have no image (or still use a
// stock photo). Protected by the cron secret; processes a small batch per call.
export const Route = createFileRoute("/api/public/hooks/backfill-insight-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest, cronUnauthorized } = await import("@/lib/cron-guard.server");
        if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized();

        const {z} = await import('zod');
        const input = z.coerce.number().int().min(1).max(8).safeParse(new URL(request.url).searchParams.get('limit') ?? 3);
        if (!input.success) return Response.json({error:'Invalid batch limit'},{status:400});
        const limit = input.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { generateInsightCover } = await import("@/lib/insight-image.server");

        // This legacy batch must not bypass the article pipeline's provider pause.
        const {data: state,error: stateError} = await supabaseAdmin.from('insight_generation_jobs').select('status,pause_reason,last_error').eq('job_key','daily-insight').single();
        if (stateError) return Response.json({error:stateError.message},{status:500});
        if (state.status === 'paused') return Response.json({paused:true,reason:state.pause_reason,error:state.last_error});
        const {data: lock,error: lockError} = await supabaseAdmin.rpc('acquire_insight_generation_job',{_job_key:'insight-cover-batch',_lease_seconds:1800});
        if (lockError) return Response.json({error:lockError.message},{status:500});
        if (!lock?.locked_until) return Response.json({skipped:'already-running-or-paused'});
        const lease = lock.locked_until;
        const finish = async (status: string,last_error: string | null) => {
          const {error} = await supabaseAdmin.from('insight_generation_jobs').update({status,last_error,locked_until:null}).eq('job_key','insight-cover-batch').eq('locked_until',lease);
          if (error) throw error;
        };
        try {

        const { data: rows, error } = await supabaseAdmin
          .from("insights")
          .select("id, title, slug, category, image_url")
          .order("published_at", { ascending: false })
          .limit(200);
        if (error) throw error;

        const pending = (rows ?? [])
          .filter((r) => !r.image_url || !r.image_url.includes("/api/public/insight-image/"))
          .slice(0, limit);

        const results: Array<{ slug: string; ok: boolean }> = [];
        for (const row of pending) {
          const image_url = await generateInsightCover({
            title: row.title,
            category: row.category,
            slug: row.slug,
            strict: true,
          });
          if (image_url) {
            const {error: updateError} = await supabaseAdmin.from("insights").update({ image_url }).eq("id", row.id);
            if (updateError) throw updateError;
          }
          results.push({ slug: row.slug, ok: Boolean(image_url) });
        }

        await finish('completed',null);
        return Response.json({ ok: true, processed: results.length, results });
        } catch (error) {
          const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
          const terminal = status >= 400 && status < 500 && status !== 429;
          const message = error instanceof Error ? error.message : String(error);
          await finish('failed',message);
          if (terminal) {
            const {error: pauseError} = await supabaseAdmin.from('insight_generation_jobs').update({status:'paused',pause_reason:'cover-provider-'+status,last_error:message}).eq('job_key','daily-insight');
            if (pauseError) throw pauseError;
          }
          return Response.json({error:message,paused:terminal},{status});
        }
      },
    },
  },
});
