import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

// Telegram bot webhook — handles user commands to query account info.
// Register once via curl (see notes at bottom). Verification uses a
// secret_token derived from TELEGRAM_BOT_TOKEN so both ends match without
// requiring another env var.

function deriveWebhookSecret(botToken: string): string {
  return createHash("sha256")
    .update(`telegram-webhook:${botToken}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[telegram-webhook] send failed", err);
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const HELP_TEXT = [
  "<b>Jenvu Bot — commands</b>",
  "",
  "/me — account summary (plan, balance, stats)",
  "/balance — current wallet balance",
  "/plan — active plan & renewal",
  "/stats — win rate, R:R, total trades",
  "/trades — last 5 trades",
  "/documents — document verification status",
  "/help — show this menu",
].join("\n");

async function handleCommand(opts: {
  botToken: string;
  chatId: number | string;
  text: string;
}) {
  const { botToken, chatId, text } = opts;
  const cmd = text.trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Look up linked user
  const { data: link } = await supabaseAdmin
    .from("telegram_alert_links")
    .select("user_id, verified_at")
    .eq("chat_id", String(chatId))
    .maybeSingle();

  if (cmd === "/start" || cmd === "/help") {
    const prefix = link?.user_id
      ? "✅ Your account is linked.\n\n"
      : "👋 <b>Welcome to Jenvu Bot</b>\n\nTo link your account, open the Jenvu dashboard → <b>Alerts</b>, paste this chat ID, and press Connect.\n\n";
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: prefix + HELP_TEXT,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return;
  }

  if (!link?.user_id) {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text:
        "🔒 This chat is not linked to a Jenvu account yet.\n\nOpen the Jenvu dashboard → <b>Alerts</b>, paste this chat ID, and press <b>Connect</b>. Then try again.",
      parse_mode: "HTML",
    });
    return;
  }

  const userId = link.user_id as string;

  // Fetch profile in parallel for the requested command
  const [balanceRes, subRes, docsAppRes, tradesRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("credit_balances")
      .select("balance, monthly_allowance, period_resets_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_subscriptions")
      .select("plan_id, status, current_period_end, billing_interval")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("founding_applications")
      .select("status, document_status, documents_verified_at, documents_rejected_reason, documents_info_request")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("trade_journal")
      .select("pair, direction, outcome, pnl, opened_at, closed_at")
      .eq("user_id", userId)
      .order("opened_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const balance = Number(balanceRes.data?.balance ?? 0);
  const planId = (subRes.data?.plan_id as string) ?? "free";
  const planStatus = (subRes.data?.status as string) ?? "inactive";
  const renews = subRes.data?.current_period_end
    ? new Date(subRes.data.current_period_end as string).toLocaleDateString()
    : "—";
  const docStatus = (docsAppRes.data?.document_status as string) ?? "not_submitted";
  const docLabel: Record<string, string> = {
    not_submitted: "❌ Not submitted",
    submitted: "🕓 Submitted — under review",
    reviewing: "🔍 Reviewing",
    info_requested: "⚠️ Info requested",
    approved: "✅ Verified",
    rejected: "❌ Rejected",
  };

  const trades = (tradesRes.data ?? []) as Array<{
    pair: string;
    direction: string;
    outcome: string;
    pnl: number | null;
    opened_at: string;
    closed_at: string | null;
  }>;
  const closed = trades.filter((t) => t.outcome !== "open");
  const wins = closed.filter((t) => t.outcome === "win").length;
  const losses = closed.filter((t) => t.outcome === "loss").length;
  const breakeven = closed.filter((t) => t.outcome === "breakeven").length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);

  const name = (profileRes.data?.display_name as string) || (profileRes.data?.email as string) || "Trader";

  if (cmd === "/balance") {
    const reset = balanceRes.data?.period_resets_at
      ? new Date(balanceRes.data.period_resets_at as string).toLocaleDateString()
      : "—";
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [
        `💰 <b>Wallet</b>`,
        ``,
        `Balance: <b>${fmtMoney(balance)}</b>`,
        `Monthly allowance: ${fmtMoney(Number(balanceRes.data?.monthly_allowance ?? 0))}`,
        `Resets: ${reset}`,
      ].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  if (cmd === "/plan") {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [
        `📦 <b>Subscription</b>`,
        ``,
        `Plan: <b>${escapeHtml(planId.toUpperCase())}</b>`,
        `Status: ${escapeHtml(planStatus)}`,
        `Billing: ${escapeHtml((subRes.data?.billing_interval as string) ?? "—")}`,
        `Renews: ${renews}`,
      ].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  if (cmd === "/documents") {
    const lines = [
      `📄 <b>Documents</b>`,
      ``,
      `Status: ${docLabel[docStatus] ?? docStatus}`,
    ];
    if (docStatus === "info_requested" && docsAppRes.data?.documents_info_request) {
      lines.push(``, `Info needed: ${escapeHtml(String(docsAppRes.data.documents_info_request))}`);
    }
    if (docStatus === "rejected" && docsAppRes.data?.documents_rejected_reason) {
      lines.push(``, `Reason: ${escapeHtml(String(docsAppRes.data.documents_rejected_reason))}`);
    }
    if (docStatus === "approved" && docsAppRes.data?.documents_verified_at) {
      lines.push(
        ``,
        `Verified: ${new Date(docsAppRes.data.documents_verified_at as string).toLocaleDateString()}`,
      );
    }
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  if (cmd === "/stats") {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [
        `📊 <b>Performance</b>`,
        ``,
        `Total trades: ${trades.length}`,
        `Closed: ${closed.length}`,
        `✅ Wins: ${wins}`,
        `❌ Losses: ${losses}`,
        `➖ Breakeven: ${breakeven}`,
        `Win rate: <b>${winRate}%</b>`,
        `Net P&amp;L: <b>${fmtMoney(totalPnl)}</b>`,
      ].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  if (cmd === "/trades") {
    if (!trades.length) {
      await tg(botToken, "sendMessage", { chat_id: chatId, text: "No trades logged yet." });
      return;
    }
    const rows = trades.slice(0, 5).map((t) => {
      const icon = t.outcome === "win" ? "✅" : t.outcome === "loss" ? "❌" : t.outcome === "open" ? "🟡" : "➖";
      const pnl = t.pnl !== null && t.pnl !== undefined ? ` (${fmtMoney(Number(t.pnl))})` : "";
      const d = new Date(t.opened_at).toLocaleDateString();
      return `${icon} ${escapeHtml(t.pair)} ${escapeHtml(t.direction)} — ${escapeHtml(t.outcome)}${pnl} · ${d}`;
    });
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [`🧾 <b>Last 5 trades</b>`, ``, ...rows].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  if (cmd === "/me") {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: [
        `👤 <b>${escapeHtml(name)}</b>`,
        ``,
        `📦 Plan: <b>${escapeHtml(planId.toUpperCase())}</b> (${escapeHtml(planStatus)})`,
        `💰 Balance: <b>${fmtMoney(balance)}</b>`,
        `📄 Documents: ${docLabel[docStatus] ?? docStatus}`,
        ``,
        `📊 Trades: ${trades.length} · Wins ${wins} · Losses ${losses}`,
        `Win rate: <b>${winRate}%</b> · Net P&amp;L: <b>${fmtMoney(totalPnl)}</b>`,
        ``,
        `Type /help for all commands.`,
      ].join("\n"),
      parse_mode: "HTML",
    });
    return;
  }

  // Unknown
  await tg(botToken, "sendMessage", {
    chat_id: chatId,
    text: "Unknown command. Type /help to see what I can do.",
  });
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return new Response("Not configured", { status: 503 });

        const expectedSecret = deriveWebhookSecret(botToken);
        const actual = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(actual, expectedSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let update: any = null;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true, ignored: "invalid-json" });
        }

        const message = update?.message ?? update?.edited_message;
        const chatId = message?.chat?.id;
        const text: string = message?.text ?? "";
        if (!chatId || !text.startsWith("/")) {
          return Response.json({ ok: true });
        }

        try {
          await handleCommand({ botToken, chatId, text });
        } catch (err) {
          console.error("[telegram-webhook] handler error", err);
          await tg(botToken, "sendMessage", {
            chat_id: chatId,
            text: "⚠️ Something went wrong. Please try again in a moment.",
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
