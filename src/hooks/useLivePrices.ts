import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLiveTick } from "@/lib/gold-analysis.functions";

const BINANCE_MAP: Record<string, string> = {
  BTCUSDT: "btcusdt", BTCUSD: "btcusdt",
  ETHUSDT: "ethusdt", ETHUSD: "ethusdt",
  SOLUSDT: "solusdt", SOLUSD: "solusdt",
  XRPUSDT: "xrpusdt", XRPUSD: "xrpusdt",
  DOGEUSDT: "dogeusdt", DOGEUSD: "dogeusdt",
  BNBUSDT: "bnbusdt", BNBUSD: "bnbusdt",
  ADAUSDT: "adausdt", ADAUSD: "adausdt",
  AVAXUSDT: "avaxusdt", AVAXUSD: "avaxusdt",
};

/** Live price map for many symbols. Uses Binance WS for crypto, polls server for the rest. */
export function useLivePrices(symbols: string[]): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const fetchTick = useServerFn(getLiveTick);
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");

  useEffect(() => {
    if (!key) return;
    const list = key.split(",").filter(Boolean);
    let stopped = false;
    const sockets: WebSocket[] = [];
    let pollId: ReturnType<typeof setInterval> | null = null;
    const pollSymbols: string[] = [];

    const set = (sym: string, p: number) => {
      if (!Number.isFinite(p)) return;
      setPrices((prev) => (prev[sym] === p ? prev : { ...prev, [sym]: p }));
    };

    for (const sym of list) {
      const upper = sym.replace(/[^A-Z0-9]/g, "");
      const stream = BINANCE_MAP[upper];
      if (stream && typeof WebSocket !== "undefined") {
        try {
          const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@trade`);
          ws.onmessage = (ev) => {
            try {
              const d = JSON.parse(ev.data);
              set(sym, parseFloat(d.p));
            } catch { /* ignore */ }
          };
          ws.onclose = () => { if (!stopped) pollSymbols.push(sym); };
          sockets.push(ws);
        } catch {
          pollSymbols.push(sym);
        }
      } else {
        pollSymbols.push(sym);
      }
    }

    const poll = async () => {
      for (const sym of pollSymbols) {
        try {
          const t = await fetchTick({ data: { symbol: sym } });
          if (stopped) return;
          if (t && typeof t.price === "number") set(sym, t.price);
        } catch { /* keep last */ }
      }
    };
    if (pollSymbols.length) {
      void poll();
      pollId = setInterval(poll, 3000);
    }

    return () => {
      stopped = true;
      for (const ws of sockets) { try { ws.close(); } catch { /* ignore */ } }
      if (pollId) clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return prices;
}
