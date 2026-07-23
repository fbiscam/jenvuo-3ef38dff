import { createFileRoute } from "@tanstack/react-router";

// Public read-only endpoint for the Chrome extension.
// Returns the most recent broadcast signal, optionally filtered by pair.
// Read-only: does NOT write, bill, or affect any other system.
export const Route = createFileRoute("/api/public/latest-signal")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      },
      GET: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };

        try {
          const url = new URL(request.url);
          const pairRaw = url.searchParams.get("pair");
          const pair = pairRaw ? pairRaw.toUpperCase().replace(/[^A-Z]/g, "") : null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          let q = supabaseAdmin
            .from("signal_alerts")
            .select(
              "id, pair, direction, grade, confidence, entry, sl, tp, rr, session, killzone, htf_bias, fired_at"
            )
            .order("fired_at", { ascending: false })
            .limit(1);

          if (pair) q = q.eq("pair", pair);

          const { data, error } = await q.maybeSingle();
          if (error) {
            return new Response(JSON.stringify({ error: "unavailable" }), {
              status: 500,
              headers: cors,
            });
          }

          if (!data) {
            return new Response(JSON.stringify({ signal: null }), { status: 200, headers: cors });
          }

          return new Response(JSON.stringify({ signal: data }), { status: 200, headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ error: "internal" }), {
            status: 500,
            headers: cors,
          });
        }
      },
    },
  },
});
