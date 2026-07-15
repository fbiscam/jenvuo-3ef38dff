import { createFileRoute } from "@tanstack/react-router";
import { computeSignalPlan } from "@/lib/gold-analysis.functions";

// Auto-scan broadcast worker. Called every 15 min by pg_cron.
// Auth: apikey header (Supabase anon).
// Flow:
//   1. Read system_settings (enabled, config)
//   2. For each pair: compute plan, run 2-hit state machine
//   3. On confirmed hit → insert signal_alerts + user_notifications + ledger row
export const Route = createFileRoute("/api/public/hooks/auto-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!apikey || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Read settings
        const { data: settings } = await supabaseAdmin
          .from("system_settings")
          .select("key, value")
          .in("key", ["auto_scan_enabled", "auto_scan_config"]);

        const settingsMap = new Map<string, Record<string, unknown>>();
        for (const s of settings ?? []) {
          settingsMap.set(
            (s as { key: string }).key,
            (s as { value: Record<string, unknown> }).value ?? {},
          );
        }
        const enabled =
          (settingsMap.get("auto_scan_enabled")?.enabled as boolean) ?? false;
        if (!enabled) {
          return Response.json({ ok: true, skipped: "disabled" });
        }

        const cfg = settingsMap.get("auto_scan_config") ?? {};
        const pairs = (cfg.pairs as string[]) ?? [
          "XAUUSD",
          "GBPUSD",
          "EURUSD",
          "US30",
          "NAS100",
        ];
        const minConf = Number(cfg.min_conf ?? 59);
        const confirmWindowMin = Number(cfg.confirm_window_min ?? 45);
        const cooldownMin = Number(cfg.cooldown_min ?? 60);
        const maxPerDay = Number(cfg.max_broadcasts_per_day ?? 8);

        // Global daily rate limit
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const { count: todayCount } = await supabaseAdmin
          .from("auto_scan_pool_ledger")
          .select("id", { count: "exact", head: true })
          .gte("created_at", dayStart.toISOString());
        if ((todayCount ?? 0) >= maxPerDay) {
          return Response.json({ ok: true, skipped: "daily_cap" });
        }

        const results: Array<Record<string, unknown>> = [];

        for (const pair of pairs) {
          try {
            const plan = await computeSignalPlan({ symbol: pair }, null);
            const dir = plan.trade?.direction;
            const conf = Number(plan.trade?.confidence ?? 0);
            const now = new Date();

            if (dir !== "BUY" && dir !== "SELL") {
              await supabaseAdmin
                .from("auto_scan_state")
                .delete()
                .eq("pair", pair);
              results.push({ pair, action: "cleared_wait", conf });
              continue;
            }

            if (conf < minConf) {
              await supabaseAdmin
                .from("auto_scan_state")
                .delete()
                .eq("pair", pair);
              results.push({ pair, action: "below_threshold", conf });
              continue;
            }

            // Check existing state
            const { data: state } = await supabaseAdmin
              .from("auto_scan_state")
              .select(
                "direction, first_conf, first_seen_at, last_broadcast_at",
              )
              .eq("pair", pair)
              .maybeSingle();

            // Cooldown check
            if (state?.last_broadcast_at) {
              const since =
                (now.getTime() -
                  new Date(state.last_broadcast_at).getTime()) /
                60000;
              if (since < cooldownMin) {
                results.push({
                  pair,
                  action: "cooldown",
                  since_min: Math.round(since),
                });
                continue;
              }
            }

            // First hit or side flip
            const withinWindow =
              state?.first_seen_at &&
              (now.getTime() - new Date(state.first_seen_at).getTime()) /
                60000 <=
                confirmWindowMin;
            const sameDirection = state?.direction === dir;

            if (!state || !sameDirection || !withinWindow) {
              await supabaseAdmin.from("auto_scan_state").upsert(
                {
                  pair,
                  direction: dir,
                  first_conf: conf,
                  first_seen_at: now.toISOString(),
                  last_broadcast_at: state?.last_broadcast_at ?? null,
                  updated_at: now.toISOString(),
                },
                { onConflict: "pair" },
              );
              results.push({ pair, action: "first_hit", conf, dir });
              continue;
            }

            // Second confirmed hit — broadcast
            const dec = plan.instrument?.decimals ?? 2;
            const entry = Number(plan.trade?.entry);
            const sl = Number(plan.trade?.sl);
            const tp = Number(plan.trade?.tp1 ?? plan.trade?.tp);
            const rr = Number(plan.trade?.rr ?? 0);
            if (!isFinite(entry) || !isFinite(sl) || !isFinite(tp)) {
              results.push({ pair, action: "invalid_levels" });
              continue;
            }
            const setupScore = Math.round(plan.setupScore ?? conf);
            const grade =
              setupScore >= 90
                ? "A+"
                : setupScore >= 80
                  ? "A"
                  : setupScore >= 65
                    ? "B"
                    : "C";

            const round = (n: number) => Number(n.toFixed(dec));

            // Insert signal_alert
            const { data: inserted, error: insErr } = await supabaseAdmin
              .from("signal_alerts")
              .insert({
                pair,
                grade,
                direction: dir,
                entry: round(entry),
                sl: round(sl),
                tp: round(tp),
                rr: Number(rr.toFixed(2)),
                confidence: Math.round(conf),
                setup_score: setupScore,
                htf_bias: plan.htfBias ?? null,
                session: null,
                killzone: plan.killzone ?? null,
                rationale: `Auto-scan · 2-hit confirmed · ${plan.alignmentLabel ?? ""}`.slice(
                  0,
                  1000,
                ),
              })
              .select("id, fired_at")
              .single();

            if (insErr || !inserted) {
              results.push({
                pair,
                action: "insert_failed",
                error: insErr?.message,
              });
              continue;
            }

            // In-app notifications to all paid users
            const { data: paidUsers } = await supabaseAdmin
              .from("user_subscriptions")
              .select("user_id")
              .eq("status", "active")
              .neq("plan_id", "free");
            const userIds = Array.from(
              new Set(
                (paidUsers ?? []).map(
                  (r: { user_id: string }) => r.user_id,
                ),
              ),
            );
            let notified = 0;
            if (userIds.length > 0) {
              const title = `${grade} ${dir} · ${pair}`;
              const body = `Entry ${round(entry)} · SL ${round(sl)} · TP ${round(tp)} · R:R ${rr.toFixed(2)} (auto-scan)`;
              const rows = userIds.map((uid) => ({
                user_id: uid,
                type: "signal_alert",
                title,
                body,
                data: {
                  alert_id: inserted.id,
                  pair,
                  grade,
                  direction: dir,
                  entry: round(entry),
                  sl: round(sl),
                  tp: round(tp),
                  rr: Number(rr.toFixed(2)),
                  confidence: Math.round(conf),
                  setup_score: setupScore,
                  source: "auto_scan",
                },
              }));
              for (let i = 0; i < rows.length; i += 500) {
                await supabaseAdmin
                  .from("user_notifications")
                  .insert(rows.slice(i, i + 500));
              }
              notified = rows.length;
            }

            // Ledger entry ($0.10 system pool cost)
            await supabaseAdmin.from("auto_scan_pool_ledger").insert({
              pair,
              direction: dir,
              confidence: Math.round(conf),
              alert_id: inserted.id,
              broadcast_count: notified,
              cost_usd: 0.1,
            });

            // Update state: mark broadcast, clear first-hit
            await supabaseAdmin.from("auto_scan_state").upsert(
              {
                pair,
                direction: dir,
                first_conf: conf,
                first_seen_at: now.toISOString(),
                last_broadcast_at: now.toISOString(),
                updated_at: now.toISOString(),
              },
              { onConflict: "pair" },
            );

            results.push({
              pair,
              action: "broadcast",
              alert_id: inserted.id,
              notified,
              conf,
              dir,
            });
          } catch (err) {
            results.push({
              pair,
              action: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return Response.json({ ok: true, results });
      },
      GET: async () => {
        return new Response("Method not allowed", { status: 405 });
      },
    },
  },
});
