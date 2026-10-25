import { createFileRoute } from "@tanstack/react-router";
import { evaluateLicense, sharedTargetStatus } from "@/lib/mt5-licenses";

// Always HTTP 200: the MT5 bot reads the JSON body only.
// The bot posts its account numbers about once a minute; the license key is the caller's proof.
const ok = (body: unknown) => Response.json(body, { status: 200 });
const num = (v: unknown, max = 1e12) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(-max, Math.min(max, n)) : 0;
};

export const Route = createFileRoute("/api/public/licenses/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let body: any = null;
          try {
            body = JSON.parse((await request.text()).replace(/\0+$/, ""));
          } catch {
            return ok({ valid: false, reason: "malformed" });
          }
          const key = String(body?.key ?? "").trim().toUpperCase().slice(0, 40);
          const account = String(body?.mt5_account ?? "").trim().slice(0, 20);
          const pre = evaluateLicense(key, account, { mt5_account: null, revoked_at: null }, null);
          if (!pre.valid && pre.reason === "malformed") return ok(pre);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const { data: lic } = await db.from("mt5_licenses").select("id,user_id,mt5_account,revoked_at").eq("license_key", key).maybeSingle();
          let sub = null;
          if (lic) {
            const { data } = await db.from("user_subscriptions").select("plan_id,status,is_trial,current_period_end").eq("user_id", lic.user_id).maybeSingle();
            sub = data ?? null;
          }
          const r = evaluateLicense(key, account, lic ?? null, sub);
          if (!r.valid) return ok(r);
          if (r.bind) return ok({ valid: false, reason: "not_found" }); // must be validated (bound) first

          const day = new Date().toISOString().slice(0, 10);
          await db.from("mt5_bot_reports").upsert(
            {
              license_id: lic.id,
              day,
              user_id: lic.user_id,
              mt5_account: account,
              symbol: String(body?.symbol ?? "").slice(0, 20),
              balance: num(body?.balance),
              equity: num(body?.equity),
              today_profit: num(body?.today_profit),
              trades_today: Math.max(0, Math.round(num(body?.trades_today, 100000))),
              open_trades: Math.max(0, Math.round(num(body?.open_trades, 100000))),
              open_lots: Math.max(0, num(body?.open_lots, 100000)),
              target_hit: body?.target_hit === true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "license_id,day" },
          );

          // Combined profit across this user's active licenses today.
          const { data: active } = await db.from("mt5_licenses").select("id").eq("user_id", lic.user_id).is("revoked_at", null);
          const ids = (active ?? []).map((x: any) => x.id);
          const { data: rows } = await db.from("mt5_bot_reports").select("today_profit,target_hit").eq("user_id", lic.user_id).eq("day", day).in("license_id", ids);
          const list = rows ?? [];
          const s = sharedTargetStatus(r.daily_target, list.map((x: any) => Number(x.today_profit)), list.some((x: any) => x.target_hit));
          if (s.stop) await db.from("mt5_bot_reports").update({ target_hit: true }).eq("user_id", lic.user_id).eq("day", day);
          return ok({ valid: true, daily_target: r.daily_target, combined_profit: s.combined, stop: s.stop });
        } catch {
          return ok({ valid: false, reason: "server_error" });
        }
      },
    },
  },
});
