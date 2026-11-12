import { createFileRoute } from "@tanstack/react-router";
import { DAILY_DRAWDOWN_PCT, DAILY_TARGET_PCT, dailyStopFor, reportDayProfit, reportDayStart, sessionStep, sharedTargetStatus } from "@/lib/mt5-licenses";
import { checkBotByIp } from "@/lib/mt5-ip-license.server";

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
          const { r, lic, account } = await checkBotByIp(body, request.headers);
          if (!r.valid) return ok(r);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;

          // ON/OFF history: extend the open session or start a new one; "stop" closes it with MT5's reason.
          const nowIso = new Date().toISOString();
          const event = body?.event === "start" || body?.event === "stop" ? body.event : undefined;
          const reason = String(body?.reason ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 20) || null;
          const { data: last } = await db.from("mt5_bot_sessions").select("id,last_seen_at,ended_at").eq("license_id", lic.id).order("started_at", { ascending: false }).limit(1).maybeSingle();
          if (sessionStep(last ?? null, Date.now(), event) === "new") {
            if (last && !last.ended_at) await db.from("mt5_bot_sessions").update({ ended_at: last.last_seen_at, end_reason: "lost" }).eq("id", last.id);
            await db.from("mt5_bot_sessions").insert({ license_id: lic.id, user_id: lic.user_id, mt5_account: account, started_at: nowIso, last_seen_at: nowIso, ...(event === "stop" ? { ended_at: nowIso, end_reason: reason } : {}) });
          } else {
            await db.from("mt5_bot_sessions").update({ last_seen_at: nowIso, ...(event === "stop" ? { ended_at: nowIso, end_reason: reason } : {}) }).eq("id", last.id);
          }
          if (event === "stop") return ok({ valid: true, recorded: true });

          const day = new Date().toISOString().slice(0, 10);
          // Saved profit = closed balance gain since this UTC day began (broker rollover can't reset it).
          const { data: cur } = await db.from("mt5_bot_reports").select("start_balance").eq("license_id", lic.id).eq("day", day).maybeSingle();
          const { data: prev } = cur?.start_balance == null
            ? await db.from("mt5_bot_reports").select("balance").eq("user_id", lic.user_id).eq("mt5_account", account).lt("day", day).order("day", { ascending: false }).order("updated_at", { ascending: false }).limit(1).maybeSingle()
            : { data: null };
          const startBalance = reportDayStart(cur?.start_balance, prev?.balance, num(body?.equity), num(body?.today_profit));
          await db.from("mt5_bot_reports").upsert(
            {
              license_id: lic.id,
              day,
              user_id: lic.user_id,
              mt5_account: account,
              symbol: String(body?.symbol ?? "").slice(0, 20),
              balance: num(body?.balance),
              equity: num(body?.equity),
              today_profit: reportDayProfit(num(body?.balance), startBalance),
              start_balance: startBalance,
              trades_today: Math.max(0, Math.round(num(body?.trades_today, 100000))),
              open_trades: Math.max(0, Math.round(num(body?.open_trades, 100000))),
              open_lots: Math.max(0, num(body?.open_lots, 100000)),
              target_hit: body?.target_hit === true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "license_id,day" },
          );

          // Each license has its own daily target: only this account's profit today counts.
          // Fixed by the server: plan % of the day's starting balance and the 4.7% drawdown guard (EA inputs can't change them).
          const profit = num(body?.today_profit);
          const d = dailyStopFor(r.plan, num(body?.balance), profit);
          const target = d.start > 0 ? d.target : r.daily_target;
          const s = sharedTargetStatus(target, [profit], body?.target_hit === true);
          return ok({ valid: true, daily_target: target, daily_target_pct: DAILY_TARGET_PCT[r.plan], max_daily_drawdown: d.drawdown, drawdown_pct: DAILY_DRAWDOWN_PCT, profit: s.combined, stop: s.stop || d.stop, stop_reason: d.reason ?? (s.stop ? "target" : null) });
        } catch {
          return ok({ valid: false, reason: "server_error" });
        }
      },
    },
  },
});
