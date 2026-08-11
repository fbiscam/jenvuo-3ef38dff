// Server-only helper shared by the Telegram webhook and the /api/public/telegram/admin
// run-scan action. Mirrors the /signal page pipeline: balance check →
// computeSignalPlan → same gates (killzone, HTF, min conf).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTO_MIN_CONF = 70;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
}

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[telegram-scan] send failed", err);
  }
}

export async function runTelegramScan(opts: {
  botToken: string;
  chatId: number | string;
  userId: string;
  pair: string;
}) {
  const { botToken, chatId, userId } = opts;
  const pair = String(opts.pair || "").toUpperCase().replace(/[^A-Z]/g, "");

  // 1. Balance pre-flight ($0.20 flat per-signal charge)
  const { data: bal } = await supabaseAdmin
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  const balance = Number(bal?.balance ?? 0);
  if (balance < 0.2) {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: `⚠️ <b>Balance too low</b>\n\nYou need at least <b>$0.20</b> per signal scan. Current balance: <b>${fmtMoney(balance)}</b>.\n\nAdd funds in the dashboard → Billing to continue.`,
      parse_mode: "HTML",
    });
    return;
  }

  // 2. Run the exact same server-side compute path /signal uses.
  //    NOTE: the "Scanning..." ack is sent by the webhook before this runs,
  //    so the user always sees progress immediately.
  let plan: any = null;
  try {
    const scanId =
      (globalThis as any).crypto?.randomUUID?.() ??
      `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const { computeSignalPlan } = await import("@/lib/gold-analysis.functions");
    plan = await computeSignalPlan({ symbol: pair }, userId, { scanId });
  } catch (err) {
    console.error("[telegram scan] compute failed", err);
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: `❌ Analysis failed for <b>${escapeHtml(pair)}</b>. Try again in a moment.`,
      parse_mode: "HTML",
    });
    return;
  }

  const trade = plan?.trade ?? {};
  const dir = String(trade.direction ?? "WAIT").toUpperCase();
  const conf = Number(trade.confidence ?? 0);
  const kz = String(plan?.killzone ?? "");
  const inKillzone = /Killzone/i.test(kz) && !/Outside/i.test(kz);
  const isAsia = /asia/i.test(kz);
  const htfBias = String(plan?.htfBias ?? "neutral");
  const utcH = new Date().getUTCHours();
  const isNyAm = utcH >= 12 && utcH < 16;
  const aligned =
    (dir === "BUY" && htfBias === "bullish") ||
    (dir === "SELL" && htfBias === "bearish") ||
    (isNyAm && htfBias === "neutral");

  let gateBlock: string | null = null;
  if (dir !== "BUY" && dir !== "SELL") {
    gateBlock = "No directional setup right now — market is in HOLD.";
  } else if (conf < AUTO_MIN_CONF) {
    gateBlock = `Confidence <b>${Math.round(conf)}%</b> is below the ${AUTO_MIN_CONF}% minimum.`;
  } else if (!inKillzone || isAsia) {
    gateBlock = `Outside a valid killzone (${escapeHtml(kz || "n/a")}). Fires only in London / NY AM / NY PM.`;
  } else if (!aligned) {
    gateBlock = `${dir} conflicts with HTF bias (${escapeHtml(htfBias)}).`;
  }

  const header = `📈 <b>${escapeHtml(pair)}</b> · ${escapeHtml(kz || "n/a")}`;
  const meta = `Grade <b>${escapeHtml(String(plan?.setupGrade ?? "-"))}</b> · HTF ${escapeHtml(htfBias)} · Conf <b>${Math.round(conf)}%</b>`;

  if (gateBlock) {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [header, meta, "", `🚫 <b>No trade this scan</b>`, gateBlock].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  const arrow = dir === "BUY" ? "🟢" : "🔴";
  const lines = [
    header,
    meta,
    "",
    `${arrow} <b>${dir} ${escapeHtml(pair)}</b>`,
    `Entry: <b>${escapeHtml(String(trade.entry ?? "-"))}</b>`,
    `SL: <b>${escapeHtml(String(trade.sl ?? "-"))}</b>`,
    `TP1: <b>${escapeHtml(String(trade.tp1 ?? trade.tp ?? "-"))}</b>`,
  ];
  if (trade.tp2) lines.push(`TP2: <b>${escapeHtml(String(trade.tp2))}</b>`);
  if (trade.tp3) lines.push(`TP3: <b>${escapeHtml(String(trade.tp3))}</b>`);
  lines.push(`R:R: <b>${escapeHtml(String(trade.rr ?? "-"))}</b>`);
  if (trade.summary) lines.push("", escapeHtml(String(trade.summary)).slice(0, 400));

  await tg(botToken, "sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
