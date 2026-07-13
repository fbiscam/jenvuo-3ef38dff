import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=15",
};

export const Route = createFileRoute("/api/public/yahoo-price")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const symbol = url.searchParams.get("symbol");
        if (!symbol || !/^[A-Za-z0-9.\-=^]+$/.test(symbol)) {
          return new Response(JSON.stringify({ error: "bad symbol" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        try {
          const y = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
          const r = await fetch(y, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
              Accept: "application/json",
            },
          });
          if (!r.ok) {
            return new Response(JSON.stringify({ price: null }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const j: any = await r.json();
          const price = Number(j?.chart?.result?.[0]?.meta?.regularMarketPrice);
          return new Response(
            JSON.stringify({ price: Number.isFinite(price) ? price : null }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            },
          );
        } catch {
          return new Response(JSON.stringify({ price: null }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
