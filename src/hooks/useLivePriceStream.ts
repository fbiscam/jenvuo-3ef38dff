import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLiveTick } from "@/lib/gold-analysis.functions";

// Binance spot streams for popular crypto pairs. Map normalized symbol -> stream name.
const BINANCE_MAP: Record<string, string> = {
  BTCUSDT: "btcusdt", BTCUSD: "btcusdt",
  ETHUSDT: "ethusdt", ETHUSD: "ethusdt",
  SOLUSDT: "solusdt", SOLUSD: "solusdt",
  XRPUSDT: "xrpusdt", XRPUSD: "xrpusdt",
  DOGEUSDT: "dogeusdt", DOGEUSD: "dogeusdt",
  BNBUSDT: "bnbusdt", BNBUSD: "bnbusdt",
  ADAUSDT: "adausdt", ADAUSD: "adausdt",
  AVAXUSDT: "avaxusdt", AVAXUSD: "avaxusdt",
  MATICUSDT: "maticusdt",
  LTCUSDT: "ltcusdt",
  LINKUSDT: "linkusdt",
  DOTUSDT: "dotusdt",
  TRXUSDT: "trxusdt",
  TONUSDT: "tonusdt",
};

export type LiveTickHandler = (price: number, tMs: number) => void;

/**
 * Streaming live price hook.
 *  - Crypto: Binance trade WebSocket (sub-second ticks).
 *  - Forex / Metals / Indices: fast polling (2s) of server `getLiveTick` as fallback.
 *  - Displays a smoothed price via requestAnimationFrame interpolation so the
 *    header updates look continuous rather than jumping every poll/tick.
 *
 * `onTick` fires with the raw (un-smoothed) market price — use it for TP/SL
 * checks, sparkline updates, and chart bar updates.
 */
export function useLivePriceStream(
  symbol: string | undefined,
  seedPrice: number | null,
  onTick?: LiveTickHandler,
) {
  const [price, setPrice] = useState<number | null>(seedPrice ?? null);
  const fetchTick = useServerFn(getLiveTick);

  const targetRef = useRef<number | null>(seedPrice ?? null);
  const displayRef = useRef<number | null>(seedPrice ?? null);
  const onTickRef = useRef<LiveTickHandler | undefined>(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!symbol) return;
    let stopped = false;
    let ws: WebSocket | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let raf: number | null = null;

    const pushTick = (p: number, tMs: number) => {
      if (!Number.isFinite(p)) return;
      targetRef.current = p;
      if (displayRef.current == null) {
        displayRef.current = p;
        setPrice(p);
      }
      onTickRef.current?.(p, tMs);
    };

    const startPolling = () => {
      if (pollId) return;
      const tick = async () => {
        try {
          const t = await fetchTick({ data: { symbol } });
          if (stopped) return;
          pushTick(t.price, typeof t.t === "number" ? t.t : Date.now());
        } catch { /* keep last */ }
      };
      void tick();
      pollId = setInterval(tick, 2000);
    };

    const upper = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const stream = BINANCE_MAP[upper];
    if (stream && typeof WebSocket !== "undefined") {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@trade`);
        ws.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            const p = parseFloat(d.p);
            pushTick(p, typeof d.T === "number" ? d.T : Date.now());
          } catch { /* ignore */ }
        };
        ws.onerror = () => { /* fall through to onclose */ };
        ws.onclose = () => { if (!stopped) startPolling(); };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    // RAF smoother — lerp displayed price toward target each frame.
    const loop = () => {
      if (stopped) return;
      const target = targetRef.current;
      const cur = displayRef.current;
      if (target != null && cur != null) {
        const diff = target - cur;
        if (Math.abs(diff) > Math.abs(target) * 1e-7) {
          const next = cur + diff * 0.2;
          const settled = Math.abs(target - next) < Math.abs(target) * 1e-7;
          displayRef.current = settled ? target : next;
          setPrice(displayRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      if (ws) { try { ws.close(); } catch { /* ignore */ } }
      if (pollId) clearInterval(pollId);
      if (raf != null) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return price;
}
