import { createFileRoute } from "@tanstack/react-router";

// Small admin/utility endpoint for the Telegram bot.
// Actions:
//   ?action=set-commands     → registers the bot command menu with Telegram
//   POST body {action:"run-scan", chatId, userId, pair}
//                            → executes a Telegram scan (invoked by the
//                              webhook via fire-and-forget so the webhook
//                              can respond within Telegram's timeout)
//
// Auth: shared secret header  x-tg-admin-token  matching env
// TG_SELFTEST_TOKEN (already provisioned).

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

const COMMANDS = [
  { command: "scan", description: "Run a manual signal scan (pick a pair)" },
  { command: "me", description: "Account summary (plan, balance, stats)" },
  { command: "balance", description: "Current wallet balance" },
  { command: "plan", description: "Active plan & renewal" },
  { command: "stats", description: "Win rate, R:R, total trades" },
  { command: "trades", description: "Last 5 trades" },
  { command: "documents", description: "Document verification status" },
  { command: "help", description: "Show all available commands" },
];

async function setCommands(botToken: string) {
  const r = await fetch(
    `https://api.telegram.org/bot${botToken}/setMyCommands`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commands: COMMANDS }),
    },
  );
  return r.json();
}

export const Route = createFileRoute("/api/public/telegram/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env.TG_SELFTEST_TOKEN ?? "";
        const got = request.headers.get("x-tg-admin-token") ?? "";
        if (!expected || got !== expected) return unauthorized();

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return new Response("Not configured", { status: 503 });

        const url = new URL(request.url);
        const action = url.searchParams.get("action") ?? "";
        if (action === "set-commands") {
          const result = await setCommands(botToken);
          return Response.json({ ok: true, result });
        }
        return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
      },
      POST: async ({ request }) => {
        const expected = process.env.TG_SELFTEST_TOKEN ?? "";
        const got = request.headers.get("x-tg-admin-token") ?? "";
        if (!expected || got !== expected) return unauthorized();

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return new Response("Not configured", { status: 503 });

        const body = (await request.json().catch(() => null)) as
          | { action?: string; chatId?: number | string; userId?: string; pair?: string }
          | null;
        if (!body || body.action !== "run-scan" || !body.chatId || !body.userId || !body.pair) {
          return Response.json({ ok: false, error: "bad request" }, { status: 400 });
        }

        try {
          const { runTelegramScan } = await import("./_scan-runner");
          await runTelegramScan({
            botToken,
            chatId: body.chatId,
            userId: body.userId,
            pair: body.pair,
          });
        } catch (err) {
          console.error("[telegram/admin] run-scan failed", err);
          return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
