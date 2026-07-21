// Chrome extension read-only endpoint.
// Auth: Authorization: Bearer jext_...  (token hashed & stored in extension_tokens)
// Returns the most recent signal alert (last 30 min) for the authenticated user's account.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/extension/latest-signal")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token || !token.startsWith("jext_")) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401, headers: { ...CORS, "content-type": "application/json" },
          });
        }
        const hash = await sha256Hex(token);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row, error } = await supabaseAdmin
          .from("extension_tokens")
          .select("id, user_id, revoked_at")
          .eq("token_hash", hash)
          .maybeSingle();
        if (error || !row || row.revoked_at) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
            status: 401, headers: { ...CORS, "content-type": "application/json" },
          });
        }

        // Bump last_used_at (fire and forget)
        void supabaseAdmin.from("extension_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", row.id);

        // Check the user actually has an active paid plan (extension is a paid perk).
        const { data: sub } = await supabaseAdmin
          .from("user_subscriptions")
          .select("plan_id, status")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const plan = sub?.plan_id;
        const paid = sub?.status === "active" && plan && plan !== "free";

        // Alerts on/off toggle
        const { data: pref } = await supabaseAdmin
          .from("alert_preferences")
          .select("alerts_enabled")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const alertsOn = pref?.alerts_enabled !== false;

        // Most recent broadcast in the last 30 minutes.
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: sig } = await supabaseAdmin
          .from("signal_alerts")
          .select(
            "id, pair, direction, entry, sl, tp, rr, confidence, grade, killzone, session, htf_bias, markings, narration, structure, swings, created_at",
          )
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            ok: true,
            paid: Boolean(paid),
            alerts_enabled: alertsOn,
            plan: plan ?? null,
            signal: paid && alertsOn ? sig ?? null : null,
            server_time: new Date().toISOString(),
          }),
          { status: 200, headers: { ...CORS, "content-type": "application/json" } },
        );

      },
    },
  },
});
