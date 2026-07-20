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

        // Gold market hours check — XAU trades ~ Sunday 22:00 UTC → Friday 21:00 UTC.
        // Skip scans when market is closed (weekend).
        const nowCheck = new Date();
        const dow = nowCheck.getUTCDay(); // 0=Sun, 6=Sat
        const utcHour = nowCheck.getUTCHours();
        const marketClosed =
          dow === 6 || // Saturday all day
          (dow === 5 && utcHour >= 21) || // Friday after 21:00 UTC
          (dow === 0 && utcHour < 22); // Sunday before 22:00 UTC
        if (marketClosed) {
          return Response.json({ ok: true, skipped: "market_closed" });
        }

        const cfg = settingsMap.get("auto_scan_config") ?? {};
        const rawPairs = (cfg.pairs as string[]) ?? [
          "XAUUSD",
          "XAUEUR",
          "XAUGBP",
          "XAUJPY",
          "XAUAUD",
          "XAUCHF",
        ];
        // Gold-only: strip any non-XAU symbols even if config has legacy entries
        const pairs = rawPairs.filter(
          (p) =>
            typeof p === "string" && p.toUpperCase().startsWith("XAU"),
        );
        const minConf = Number(cfg.min_conf ?? 64);
        const confirmWindowMin = Number(cfg.confirm_window_min ?? 45);
        const cooldownMin = Number(cfg.cooldown_min ?? 60);
        const sameDirectionLockMin = Number(cfg.same_direction_lock_min ?? 240);
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

        // News hard-pause: skip broadcasts if a high-impact USD/XAU red-folder
        // event lands within ±30 minutes of now. Volatility around NFP, CPI,
        // FOMC etc. invalidates ICT/SMC setups — better to sit out than to
        // fire on stop-runs.
        const newsPauseMin = Number(cfg.news_pause_min ?? 30);
        let newsPaused: { title: string; minutes: number } | null = null;
        try {
          const res = await fetch(
            "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
            { headers: { "User-Agent": "Mozilla/5.0" } },
          );
          if (res.ok) {
            const raw = (await res.json()) as Array<{
              title: string;
              country: string;
              date: string;
              impact: string;
            }>;
            const now = Date.now();
            for (const e of raw) {
              if (e.country !== "USD" && e.country !== "XAU") continue;
              if (!/High/i.test(e.impact)) continue;
              const mins = Math.abs((new Date(e.date).getTime() - now) / 60000);
              if (mins <= newsPauseMin) {
                newsPaused = { title: e.title, minutes: Math.round(mins) };
                break;
              }
            }
          }
        } catch {
          // Fail open — don't block scans if news feed is down.
        }
        if (newsPaused) {
          return Response.json({
            ok: true,
            skipped: "news_pause",
            event: newsPaused,
          });
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

            // Killzone gate — only fire during London / NY AM / NY PM / Asia
            // killzones. Outside-killzone tape is thin and produces low-quality
            // signals (documented losers), so skip broadcasting entirely.
            const kz = String(plan.killzone ?? "");
            const inKillzone = /Killzone/i.test(kz) && !/Outside/i.test(kz);
            if (!inKillzone) {
              await supabaseAdmin
                .from("auto_scan_state")
                .delete()
                .eq("pair", pair);
              results.push({ pair, action: "outside_killzone", conf, killzone: kz });
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
              // Dedup: if we've already broadcast this same direction for this
              // pair, don't re-broadcast until direction flips or state clears
              // (state auto-clears when dir drops to hold or below threshold).
              if (state.direction === dir) {
                results.push({
                  pair,
                  action: "already_broadcast_same_dir",
                  dir,
                });
                continue;
              }
            }

            // Cross-hook duplicate lock: a legacy/manual scanner may have already
            // inserted this pair+direction. Do not alert the same idea again for
            // several hours even if confidence temporarily dips and returns.
            const duplicateSince = new Date(
              now.getTime() - sameDirectionLockMin * 60_000,
            ).toISOString();
            const { data: recentSameDirection } = await supabaseAdmin
              .from("signal_alerts")
              .select("id, fired_at, confidence")
              .eq("pair", pair)
              .eq("direction", dir)
              .gte("fired_at", duplicateSince)
              .order("fired_at", { ascending: false })
              .limit(1);
            if (recentSameDirection?.length) {
              results.push({
                pair,
                action: "duplicate_same_direction_lock",
                dir,
                recent_alert_id: recentSameDirection[0].id,
              });
              continue;
            }

            // Two-hit confirmation: first qualifying scan only arms the signal.
            // Broadcast only if the same direction is still valid on the next
            // scan inside the confirmation window. This filters one-candle
            // spikes and AI confidence drift (e.g. 74% now, 57% later).
            const firstSeenAt =
              state?.direction === dir && state.first_seen_at
                ? new Date(state.first_seen_at)
                : null;
            const firstAgeMin = firstSeenAt
              ? (now.getTime() - firstSeenAt.getTime()) / 60000
              : Number.POSITIVE_INFINITY;
            const hasConfirmedHit =
              state?.direction === dir && firstAgeMin <= confirmWindowMin;

            if (!hasConfirmedHit) {
              await supabaseAdmin.from("auto_scan_state").upsert(
                {
                  pair,
                  direction: dir,
                  first_conf: conf,
                  first_seen_at: now.toISOString(),
                  last_broadcast_at:
                    state?.direction === dir ? state?.last_broadcast_at ?? null : null,
                  updated_at: now.toISOString(),
                },
                { onConflict: "pair" },
              );
              results.push({
                pair,
                action: "first_hit_waiting_confirmation",
                conf,
                dir,
                killzone: plan.killzone ?? null,
              });
              continue;
            }

            // Broadcast on first qualifying hit
            const dec = plan.instrument?.decimals ?? 2;
            const entry = Number(plan.trade?.entry);
            const sl = Number(plan.trade?.sl);
            const tp = Number(plan.trade?.tp1 ?? plan.trade?.tp);
            if (!isFinite(entry) || !isFinite(sl) || !isFinite(tp)) {
              results.push({ pair, action: "invalid_levels" });
              continue;
            }
            // Always compute R:R from actual entry/SL/TP distances — never trust
            // upstream `plan.trade.rr`, which has produced inflated values
            // (e.g. reporting 3.0 when SL/TP are symmetric ~1:1).
            const riskDist = Math.abs(entry - sl);
            const rewardDist = Math.abs(tp - entry);
            const rr = riskDist > 0 ? rewardDist / riskDist : 0;
            const setupScore = Math.round(plan.setupScore ?? conf);
            // Grade must reflect the displayed blended confidence, not the raw
            // setup score — otherwise a 71% signal shows as grade "C".
            const gradeBasis = Math.round(conf);
            const grade =
              gradeBasis >= 90
                ? "A+"
                : gradeBasis >= 80
                  ? "A"
                  : gradeBasis >= 64
                    ? "B"
                    : "C";


            const round = (n: number) => Number(n.toFixed(dec));

            // Detect current FX session from UTC hour
            const utcH = now.getUTCHours();
            const session =
              utcH >= 0 && utcH < 7
                ? "Asia"
                : utcH >= 7 && utcH < 12
                  ? "London"
                  : utcH >= 12 && utcH < 16
                    ? "London/NY Overlap"
                    : utcH >= 16 && utcH < 21
                      ? "New York"
                      : "After Hours";

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
                session,
                killzone: plan.killzone ?? null,
                rationale: `Auto-scan · single-hit · ${plan.alignmentLabel ?? ""}`.slice(
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
            const allPaidIds = Array.from(
              new Set(
                (paidUsers ?? []).map(
                  (r: { user_id: string }) => r.user_id,
                ),
              ),
            );
            const { filterAlertsEnabledUserIds } = await import(
              "@/lib/alert-pref-filter.server"
            );
            let userIds = await filterAlertsEnabledUserIds(allPaidIds, { grade, pair, direction: dir });

            // Per-user daily-loss kill-switch: users who enabled the guard and
            // whose realized losses today already crossed their limit get
            // filtered out of this broadcast — no notification, no email, no
            // charge. They can still see history on their dashboard.
            if (userIds.length > 0) {
              const { data: killRows } = await supabaseAdmin
                .from("user_risk_settings")
                .select("user_id, daily_loss_limit_usd, kill_switch_enabled")
                .in("user_id", userIds)
                .eq("kill_switch_enabled", true);
              const guarded = (killRows ?? []).filter(
                (r) => r.daily_loss_limit_usd && Number(r.daily_loss_limit_usd) > 0,
              );
              if (guarded.length > 0) {
                const dayStart = new Date();
                dayStart.setUTCHours(0, 0, 0, 0);
                const { data: journalRows } = await supabaseAdmin
                  .from("trade_journal")
                  .select("user_id, pnl")
                  .in("user_id", guarded.map((g) => g.user_id))
                  .gte("closed_at", dayStart.toISOString());
                const lossByUser = new Map<string, number>();
                for (const r of journalRows ?? []) {
                  const p = Number(r.pnl ?? 0);
                  if (p < 0) {
                    lossByUser.set(
                      r.user_id,
                      (lossByUser.get(r.user_id) ?? 0) + Math.abs(p),
                    );
                  }
                }
                const blocked = new Set<string>();
                for (const g of guarded) {
                  const loss = lossByUser.get(g.user_id) ?? 0;
                  if (loss >= Number(g.daily_loss_limit_usd)) blocked.add(g.user_id);
                }
                if (blocked.size > 0) {
                  userIds = userIds.filter((u) => !blocked.has(u));
                }
              }
            }
            let notified = 0;
            if (userIds.length > 0) {
              const kz = plan.killzone ? ` · ${plan.killzone}` : "";
              const title = `${grade} ${dir} · ${pair} · ${session}${kz}`;
              const body = `Entry ${round(entry)} · SL ${round(sl)} · TP ${round(tp)} · R:R ${rr.toFixed(2)} · ${Math.round(conf)}% conf`;
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
                  session,
                  killzone: plan.killzone ?? null,
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

            // Enqueue emails to opted-in paid subscribers
            let emailed = 0;
            try {
              const { enqueueSignalAlertEmails } = await import(
                "@/lib/signal-alert-email.server"
              );
              const r = await enqueueSignalAlertEmails({
                alertId: inserted.id,
                firedAt: inserted.fired_at,
                pair,
                grade,
                direction: dir,
                entry,
                sl,
                tp,
                rr,
                confidence: conf,
                decimals: dec,
                session,
                killzone: plan.killzone ?? null,
                htfBias: plan.htfBias ?? null,
                rationale: `Auto-scan · ${plan.alignmentLabel ?? ""}`.slice(0, 500),
              });
              emailed = r.enqueued;
            } catch (e) {
              // Don't fail the scan if email enqueue errors out
              console.error("auto-scan email enqueue failed", e);
            }

            // Ledger entry (system pool cost per broadcast)
            await supabaseAdmin.from("auto_scan_pool_ledger").insert({
              pair,
              direction: dir,
              confidence: Math.round(conf),
              alert_id: inserted.id,
              broadcast_count: notified,
              cost_usd: 0.2,
            });

            // Per-recipient billing: charge $0.20 to every paid user who
            // opted in via alerts_enabled (already filtered above in
            // `userIds`). Users who disabled alerts are not in `userIds`
            // and are not charged. Idempotent via unique per-user scanId.
            let charged = 0;
            if (userIds.length > 0) {
              try {
                const { chargeSignalScan } = await import(
                  "@/lib/ai-cost-log.server"
                );
                const model = "auto-scan/ict-smc";
                await Promise.all(
                  userIds.map(async (uid) => {
                    try {
                      await chargeSignalScan({
                        userId: uid,
                        direction: dir,
                        model,
                        symbol: pair,
                        scanId: `auto_${inserted.id}_${uid}`,
                        grade,
                        score: setupScore,
                      });
                      charged += 1;
                    } catch (err) {
                      console.warn(
                        "auto-scan chargeSignalScan failed for",
                        uid,
                        (err as Error)?.message,
                      );
                    }
                  }),
                );
              } catch (e) {
                console.warn(
                  "auto-scan chargeSignalScan module import failed",
                  (e as Error)?.message,
                );
              }
            }



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
              emailed,
              charged,
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
