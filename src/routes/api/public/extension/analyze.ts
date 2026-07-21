// Chrome extension manual "Analyze Now" endpoint.
// Auth: Authorization: Bearer jext_...  (extension_tokens.token_hash)
// Runs computeSignalPlan for the requested pair (same engine as auto-scan),
// charges the user $0.20 via chargeSignalScan (idempotent by scanId), and
// returns the full plan (entry/SL/TP + markings + narration + structure) so
// the extension can draw the guided ICT/SMC walk-through on TradingView.
import { createFileRoute } from "@tanstack/react-router";
import { computeSignalPlan } from "@/lib/gold-analysis.functions";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_PAIRS = new Set([
  "XAUUSD",
  "XAUEUR",
  "XAUGBP",
  "XAUJPY",
  "XAUAUD",
  "XAUCHF",
]);

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/extension/analyze")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token || !token.startsWith("jext_")) {
          return j(401, { ok: false, error: "unauthorized" });
        }

        let body: { pair?: string } = {};
        try {
          body = await request.json();
        } catch {
          return j(400, { ok: false, error: "invalid_json" });
        }
        const pair = String(body.pair ?? "").toUpperCase().replace("/", "");
        if (!ALLOWED_PAIRS.has(pair)) {
          return j(400, { ok: false, error: "invalid_pair" });
        }

        const hash = await sha256Hex(token);
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: tokenRow, error: tokenErr } = await supabaseAdmin
          .from("extension_tokens")
          .select("id, user_id, revoked_at")
          .eq("token_hash", hash)
          .maybeSingle();
        if (tokenErr || !tokenRow || tokenRow.revoked_at) {
          return j(401, { ok: false, error: "invalid_token" });
        }
        void supabaseAdmin
          .from("extension_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", tokenRow.id);

        const userId = tokenRow.user_id as string;

        // Plan gate: extension is a paid perk.
        const { data: sub } = await supabaseAdmin
          .from("user_subscriptions")
          .select("plan_id, status")
          .eq("user_id", userId)
          .maybeSingle();
        const paid =
          sub?.status === "active" && sub?.plan_id && sub.plan_id !== "free";
        if (!paid) {
          return j(402, { ok: false, error: "paid_plan_required" });
        }

        // Balance pre-check (computeSignalPlan will charge $0.20; surface a
        // friendlier error up-front so the popup can show "add funds").
        const { data: bal } = await supabaseAdmin
          .from("credit_balances")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();
        const balance = Number(bal?.balance ?? 0);
        if (balance < 0.2) {
          return j(402, {
            ok: false,
            error: "insufficient_balance",
            balance,
            required: 0.2,
          });
        }

        // Idempotent per-call scan id so identical clicks in the same minute
        // don't double-charge.
        const scanId = `ext-manual-${userId}-${pair}-${Math.floor(
          Date.now() / 60000,
        )}`;

        try {
          const plan = await computeSignalPlan(
            { symbol: pair },
            userId,
            { scanId },
          );

          const p = plan as any;
          return j(200, {
            ok: true,
            pair,
            scan_id: scanId,
            plan: {
              pair,
              direction: p.trade?.direction ?? null,
              entry: p.trade?.entry ?? null,
              sl: p.trade?.sl ?? null,
              tp: p.trade?.tp1 ?? p.trade?.tp ?? null,
              rr: p.trade?.rr ?? null,
              confidence: p.trade?.confidence ?? null,
              grade: p.trade?.setupGrade ?? null,
              killzone: p.killzone ?? null,
              htf_bias: p.htfBias ?? null,
              markings: Array.isArray(p.markings) ? p.markings.slice(0, 40) : [],
              narration: Array.isArray(p.narration)
                ? p.narration.slice(0, 12)
                : [],
              structure: {
                htfBias: p.htfBias ?? null,
                ltfBias: p.ltfBias ?? null,
                alignmentLabel: p.alignmentLabel ?? null,
              },
            },
            server_time: new Date().toISOString(),
          });
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "computeSignalPlan failed";
          if (/INSUFFICIENT|insufficient/i.test(msg)) {
            return j(402, { ok: false, error: "insufficient_balance" });
          }
          return j(500, { ok: false, error: msg });
        }
      },
    },
  },
});
