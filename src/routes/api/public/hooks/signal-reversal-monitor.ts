import { createFileRoute } from "@tanstack/react-router";
import { getLiveTick, computeSignalPlan } from "@/lib/gold-analysis.functions";

// Signal reversal monitor — runs every 2 min via pg_cron.
// For each recently broadcast signal (pending paper trade in the last 4h),
// checks live price + fresh direction. If the setup has invalidated
// (SL hit OR fresh scan flips direction with decent conf), sends a
// reversal alert (in-app notification + telegram + email) to the same
// paid subscribers, and auto-closes matching open trade_journal entries
// with the current locked P/L so profit is "reserved".

const WATCH_HOURS = 4;
const FLIP_MIN_CONF = 62;

export const Route = createFileRoute(
  "/api/public/hooks/signal-reversal-monitor",
)({
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

        const cutoff = new Date(
          Date.now() - WATCH_HOURS * 3_600_000,
        ).toISOString();

        const { data: watching, error } = await supabaseAdmin
          .from("signal_paper_trades")
          .select(
            "id, pair, direction, entry, sl, tp, rr, confidence, grade, broadcast_alert_id, fired_at",
          )
          .eq("outcome", "pending")
          .is("reversal_notified_at", null)
          .gte("fired_at", cutoff)
          .limit(50);

        if (error) {
          return Response.json(
            { ok: false, error: error.message },
            { status: 500 },
          );
        }
        if (!watching || watching.length === 0) {
          return Response.json({ ok: true, checked: 0 });
        }

        const results: Array<Record<string, unknown>> = [];

        for (const t of watching) {
          try {
            const entry = Number(t.entry);
            const sl = Number(t.sl);
            const tp = Number(t.tp);
            const isBuy = t.direction === "BUY";
            const riskDist = Math.abs(entry - sl) || 1;
            const rewardDist = Math.abs(tp - entry) || 1;

            const tick = await getLiveTick({ data: { symbol: t.pair } });
            const lp = Number(tick?.price);
            if (!isFinite(lp) || lp <= 0) {
              results.push({ id: t.id, action: "no_price" });
              continue;
            }

            // Unrealized R
            const moveFav = isBuy ? lp - entry : entry - lp;
            const rNow = moveFav / riskDist;

            // TP hit → resolve as win, no reversal
            const tpHit = isBuy ? lp >= tp : lp <= tp;
            if (tpHit) {
              await supabaseAdmin
                .from("signal_paper_trades")
                .update({
                  outcome: "win",
                  realized_r: Number((rewardDist / riskDist).toFixed(3)),
                  resolved_at: new Date().toISOString(),
                })
                .eq("id", t.id);
              results.push({ id: t.id, action: "tp_hit" });
              continue;
            }

            // Reversal triggers:
            //   1. SL hit → hard invalidation
            //   2. Fresh scan flips direction with confidence >= FLIP_MIN_CONF
            const slHit = isBuy ? lp <= sl : lp >= sl;

            let flipped = false;
            let flipConf = 0;
            if (!slHit) {
              try {
                const fresh = await computeSignalPlan(
                  { symbol: t.pair },
                  null,
                );
                const freshDir = fresh.trade?.direction;
                flipConf = Number(fresh.trade?.confidence ?? 0);
                if (
                  freshDir &&
                  freshDir !== t.direction &&
                  flipConf >= FLIP_MIN_CONF
                ) {
                  flipped = true;
                }
              } catch {
                // upstream hiccup — skip flip check this tick
              }
            }

            if (!slHit && !flipped) {
              results.push({
                id: t.id,
                action: "still_valid",
                r_now: Number(rNow.toFixed(2)),
              });
              continue;
            }

            const reason: "sl_hit" | "flipped" = slHit ? "sl_hit" : "flipped";
            const lockedR = Number(rNow.toFixed(3));
            // Cap to sensible range for display
            const displayR = Math.max(-2, Math.min(3, lockedR));

            // Find recipients: paid users with alerts_enabled (same audience
            // as original broadcast).
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
            const userIds = await filterAlertsEnabledUserIds(allPaidIds, {
              grade: (t.grade as "A+" | "A" | "B" | "C") ?? "B",
              pair: t.pair,
              direction: t.direction as "BUY" | "SELL",
            });

            // 1) In-app notifications (client hook plays sound + shows toast)
            let notified = 0;
            if (userIds.length > 0) {
              const round = (n: number) => Number(n.toFixed(2));
              const status =
                displayR >= 0.05
                  ? `Profit locked ${displayR.toFixed(2)}R`
                  : displayR <= -0.05
                    ? `Loss locked ${displayR.toFixed(2)}R`
                    : "Breakeven";
              const title =
                reason === "sl_hit"
                  ? `Signal invalidated · ${t.pair} ${t.direction}`
                  : `Signal reversed · ${t.pair} ${t.direction}`;
              const body =
                reason === "sl_hit"
                  ? `SL hit at ${round(lp)}. ${status}. Trade auto-closed.`
                  : `Bias flipped opposite (${Math.round(flipConf)}% conf). ${status}. Trade auto-closed to reserve P/L.`;
              const rows = userIds.map((uid) => ({
                user_id: uid,
                type: "signal_reversal",
                title,
                body,
                data: {
                  alert_id: t.broadcast_alert_id,
                  paper_trade_id: t.id,
                  pair: t.pair,
                  direction: t.direction,
                  entry,
                  sl,
                  tp,
                  price_now: round(lp),
                  locked_r: displayR,
                  reason,
                  flip_conf: reason === "flipped" ? Math.round(flipConf) : null,
                },
              }));
              for (let i = 0; i < rows.length; i += 500) {
                await supabaseAdmin
                  .from("user_notifications")
                  .insert(rows.slice(i, i + 500));
              }
              notified = rows.length;
            }

            // 2) Auto-close matching open trade_journal entries for these users
            //    (users who booked the original signal via "Trade Done"). Match
            //    on pair + direction + open state + entry within 15 min window.
            let closedTrades = 0;
            if (userIds.length > 0) {
              const dir = t.direction === "BUY" ? "long" : "short";
              const openedSince = new Date(
                new Date(t.fired_at).getTime() - 15 * 60_000,
              ).toISOString();
              const { data: openTrades } = await supabaseAdmin
                .from("trade_journal")
                .select("id, user_id, entry, stop_loss")
                .in("user_id", userIds)
                .eq("pair", t.pair)
                .eq("direction", dir)
                .eq("outcome", "open")
                .gte("opened_at", openedSince);

              const matches = (openTrades ?? []).filter((tr) => {
                const trEntry = Number(tr.entry ?? entry);
                return Math.abs(trEntry - entry) <= riskDist * 0.5;
              });

              if (matches.length > 0) {
                // pnl in $ terms per unit; simplified as locked R × riskDist
                // (users see realised R + price; monetary conversion depends
                // on lot sizing which lives client-side).
                const outcome =
                  displayR >= 0.05
                    ? "win"
                    : displayR <= -0.05
                      ? "loss"
                      : "breakeven";
                const pnl = Number((displayR * riskDist).toFixed(4));
                await supabaseAdmin
                  .from("trade_journal")
                  .update({
                    outcome,
                    pnl,
                    closed_at: new Date().toISOString(),
                    notes: `Auto-closed by reversal monitor (${reason}). Locked ${displayR.toFixed(2)}R at ${lp.toFixed(2)}.`,
                  })
                  .in(
                    "id",
                    matches.map((m) => m.id),
                  );
                closedTrades = matches.length;
              }
            }

            // 3) Telegram fan-out
            let tgSent = 0;
            try {
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              if (botToken && userIds.length > 0) {
                const { data: links } = await supabaseAdmin
                  .from("telegram_alert_links")
                  .select("user_id, chat_id")
                  .in("user_id", userIds)
                  .eq("telegram_enabled", true)
                  .not("verified_at", "is", null);
                const rows = (links ?? []) as Array<{
                  user_id: string;
                  chat_id: string;
                }>;
                const statusLine =
                  displayR >= 0.05
                    ? `<b>Profit locked:</b> ${displayR.toFixed(2)}R`
                    : displayR <= -0.05
                      ? `<b>Loss locked:</b> ${displayR.toFixed(2)}R`
                      : `<b>Breakeven</b>`;
                const headline =
                  reason === "sl_hit"
                    ? `⚠️ Signal invalidated`
                    : `🔄 Signal reversed`;
                const msg = [
                  headline,
                  ``,
                  `<b>${t.direction} · ${t.pair}</b>`,
                  `Entry: <b>${entry.toFixed(2)}</b>`,
                  `Price now: <b>${lp.toFixed(2)}</b>`,
                  statusLine,
                  reason === "flipped"
                    ? `New bias confidence: <b>${Math.round(flipConf)}%</b>`
                    : `SL was: <b>${sl.toFixed(2)}</b>`,
                  ``,
                  `Trade auto-closed to reserve current P/L.`,
                ].join("\n");
                for (const row of rows) {
                  try {
                    await fetch(
                      `https://api.telegram.org/bot${botToken}/sendMessage`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          chat_id: row.chat_id,
                          text: msg,
                          parse_mode: "HTML",
                          disable_web_page_preview: true,
                        }),
                      },
                    );
                    tgSent++;
                  } catch {
                    // ignore per-recipient failure
                  }
                }
              }
            } catch (e) {
              console.warn(
                "reversal telegram failed",
                (e as Error)?.message,
              );
            }

            // 4) Email fan-out (plain text via queue)
            let emailed = 0;
            try {
              if (userIds.length > 0) {
                // Filter by email prefs
                const { filterEmailRecipientIds } = await import(
                  "@/lib/alert-pref-filter.server"
                );
                const emailIds = await filterEmailRecipientIds(userIds, {
                  grade: (t.grade as "A+" | "A" | "B" | "C") ?? "B",
                  pair: t.pair,
                  direction: t.direction as "BUY" | "SELL",
                });
                // Resolve emails
                const resolved = (
                  await Promise.all(
                    emailIds.map(async (uid) => {
                      try {
                        const { data, error: aerr } =
                          await supabaseAdmin.auth.admin.getUserById(uid);
                        if (aerr) return null;
                        return (data.user?.email ?? "").toLowerCase().trim();
                      } catch {
                        return null;
                      }
                    }),
                  )
                ).filter((e): e is string => !!e && /.+@.+\..+/.test(e));
                const uniqueEmails = Array.from(new Set(resolved));
                const subject =
                  reason === "sl_hit"
                    ? `Signal invalidated — ${t.pair} ${t.direction}`
                    : `Signal reversed — ${t.pair} ${t.direction}`;
                const statusLine =
                  displayR >= 0.05
                    ? `Profit locked: ${displayR.toFixed(2)}R`
                    : displayR <= -0.05
                      ? `Loss locked: ${displayR.toFixed(2)}R`
                      : `Breakeven`;
                const textBody = [
                  reason === "sl_hit"
                    ? `Your signal was invalidated — the stop-loss level was reached.`
                    : `Your signal has reversed — a fresh scan shows opposite bias with ${Math.round(flipConf)}% confidence.`,
                  ``,
                  `Pair: ${t.pair}`,
                  `Direction: ${t.direction}`,
                  `Entry: ${entry.toFixed(2)}`,
                  `Price now: ${lp.toFixed(2)}`,
                  `${statusLine}`,
                  ``,
                  `Your booked trade has been auto-closed to reserve current P/L.`,
                  ``,
                  `Open dashboard: https://jenvu.com/dashboard/notifications`,
                ].join("\n");
                const html = `<div style="font-family:'Google Sans','Segoe UI',Arial,sans-serif;color:#111;line-height:1.5;padding:16px">
                  <h2 style="margin:0 0 12px">${reason === "sl_hit" ? "⚠️ Signal invalidated" : "🔄 Signal reversed"}</h2>
                  <p style="margin:0 0 8px">${
                    reason === "sl_hit"
                      ? "Your signal was invalidated — the stop-loss level was reached."
                      : `Your signal has reversed — a fresh scan shows opposite bias with <b>${Math.round(flipConf)}%</b> confidence.`
                  }</p>
                  <table style="border-collapse:collapse;margin:12px 0">
                    <tr><td style="padding:4px 12px 4px 0;color:#666">Pair</td><td style="padding:4px 0"><b>${t.pair}</b></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#666">Direction</td><td style="padding:4px 0"><b>${t.direction}</b></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#666">Entry</td><td style="padding:4px 0"><b>${entry.toFixed(2)}</b></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#666">Price now</td><td style="padding:4px 0"><b>${lp.toFixed(2)}</b></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#666">Status</td><td style="padding:4px 0"><b>${statusLine}</b></td></tr>
                  </table>
                  <p style="margin:12px 0 0">Your booked trade has been auto-closed to reserve current P/L.</p>
                  <p style="margin:12px 0 0"><a href="https://jenvu.com/dashboard/notifications" style="color:#2563eb">Open dashboard</a></p>
                </div>`;
                for (const email of uniqueEmails) {
                  try {
                    const { data: suppressed } = await supabaseAdmin
                      .from("suppressed_emails")
                      .select("id")
                      .eq("email", email)
                      .maybeSingle();
                    if (suppressed) continue;
                    let token: string | null = null;
                    const { data: existingToken } = await supabaseAdmin
                      .from("email_unsubscribe_tokens")
                      .select("token, used_at")
                      .eq("email", email)
                      .maybeSingle();
                    if (existingToken?.used_at) continue;
                    if (existingToken?.token) {
                      token = existingToken.token;
                    } else {
                      const bytes = new Uint8Array(32);
                      crypto.getRandomValues(bytes);
                      token = Array.from(bytes)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                      await supabaseAdmin
                        .from("email_unsubscribe_tokens")
                        .upsert({ token, email }, { onConflict: "email", ignoreDuplicates: true });
                    }
                    const unsubscribeUrl = `https://jenvu.com/unsubscribe?token=${encodeURIComponent(token)}`;
                    const htmlWithUnsubscribe = `${html}<p style="font-family:'Google Sans','Segoe UI',Arial,sans-serif;font-size:12px;color:#71717a;margin:18px 16px 0"><a href="${unsubscribeUrl}" style="color:#52525b">Unsubscribe</a> · <a href="https://jenvu.com/dashboard/notifications" style="color:#52525b">Manage alerts</a></p>`;
                    const textWithUnsubscribe = `${textBody}\n\nUnsubscribe: ${unsubscribeUrl}`;
                    const messageId = crypto.randomUUID();
                    await supabaseAdmin.from("email_send_log").insert({
                      message_id: messageId,
                      template_name: "signal-reversal",
                      recipient_email: email,
                      status: "pending",
                    });
                    const { error: enqErr } = await supabaseAdmin.rpc(
                      "enqueue_email",
                      {
                        queue_name: "transactional_emails",
                        payload: {
                          message_id: messageId,
                          to: email,
                          from: "Jenvu Signal Desk <signals@notify.jenvu.net>",
                          sender_domain: "notify.jenvu.net",
                          subject,
                          html: htmlWithUnsubscribe,
                          text: textWithUnsubscribe,
                          purpose: "transactional",
                          label: "signal-reversal",
                          idempotency_key: `reversal-${t.id}-${email}`,
                          unsubscribe_token: token,
                          queued_at: new Date().toISOString(),
                        },
                      },
                    );
                    if (!enqErr) emailed++;
                  } catch {
                    // per-recipient failure — continue
                  }
                }
              }
            } catch (e) {
              console.warn(
                "reversal email fan-out failed",
                (e as Error)?.message,
              );
            }

            // Mark paper trade
            await supabaseAdmin
              .from("signal_paper_trades")
              .update({
                reversal_notified_at: new Date().toISOString(),
                ...(slHit
                  ? {
                      outcome: "loss",
                      realized_r: -1,
                      resolved_at: new Date().toISOString(),
                    }
                  : {}),
              })
              .eq("id", t.id);

            results.push({
              id: t.id,
              action: "reversal_broadcast",
              reason,
              locked_r: displayR,
              notified,
              tg_sent: tgSent,
              emailed,
              trades_closed: closedTrades,
            });
          } catch (err) {
            results.push({
              id: t.id,
              action: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return Response.json({
          ok: true,
          checked: watching.length,
          results,
        });
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
