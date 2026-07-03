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

function binanceStreamFor(symbol: string): string | null {
  const upper = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Only stream from Binance for symbols we've explicitly whitelisted as real
  // crypto spot markets. The previous regex fallbacks mapped XAUUSD→xauusdt,
  // XAGUSD→xagusdt (nonexistent streams that silently never tick), and
  // EURUSD→eurusdt (a Binance stablecoin pair, NOT forex spot — the header
  // then drifts from the server-computed entry/SL/TP which use Yahoo forex).
  if (BINANCE_MAP[upper]) return BINANCE_MAP[upper];
  // Native stablecoin quote pairs are safe (e.g. FOOUSDT explicitly).
  if (/^[A-Z0-9]{2,15}(USDT|USDC|BUSD)$/.test(upper)) return upper.toLowerCase();
  return null;
}


export type LiveTickHandler = (price: number, tMs: number) => void;

/**
 * Streaming live price hook.
 *  - Crypto: Binance trade WebSocket (sub-second ticks).
 *  - Forex / Metals / Indices / Stocks: fast polling (1s) of server `getLiveTick` as fallback.
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

    // Reset refs on symbol change so first tick from the new market renders
    // immediately rather than being lerped from the previous symbol's price.
    targetRef.current = null;
    displayRef.current = null;

    const pushTick = (p: number, tMs: number) => {
      if (!Number.isFinite(p)) return;
      const prev = displayRef.current;
      targetRef.current = p;
      // Snap (skip smoothing) on first tick or on large jumps (>0.25%) so the
      // header stays visibly in sync with the market instead of easing behind.
      if (prev == null || Math.abs(p - prev) / p > 0.0025) {
        displayRef.current = p;
        setPrice(p);
      }
      onTickRef.current?.(p, tMs);
    };

    const startPolling = (intervalMs: number) => {
      if (pollId) return;
      const tick = async () => {
        try {
          const t = await fetchTick({ data: { symbol } });
          if (stopped || !t) return;
          pushTick(t.price, typeof t.t === "number" ? t.t : Date.now());
        } catch { /* keep last */ }
      };
      void tick();
      pollId = setInterval(tick, intervalMs);
    };

    const stream = binanceStreamFor(symbol);
    let firstTickTimer: ReturnType<typeof setTimeout> | null = null;
    if (stream && typeof WebSocket !== "undefined") {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@trade`);
        ws.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            const p = parseFloat(d.p);
            pushTick(p, typeof d.T === "number" ? d.T : Date.now());
            if (firstTickTimer) { clearTimeout(firstTickTimer); firstTickTimer = null; }
          } catch { /* ignore */ }
        };
        ws.onerror = () => { /* fall through to onclose */ };
        ws.onclose = () => { if (!stopped) startPolling(1500); };
        // Watchdog: if no tick lands within 4s (accepted subscription but silent
        // stream), start polling in parallel so the header keeps moving.
        firstTickTimer = setTimeout(() => { if (!stopped) startPolling(1500); }, 4000);
      } catch {
        startPolling(1500);
      }
    } else {
      // Non-crypto (forex / metals / indices / stocks): poll fast (1s) so the
      // ticker feels live rather than lagging behind broker prices.
      startPolling(1000);
    }


    // RAF smoother — lerp displayed price toward target each frame for small
    // moves. Large jumps are snapped in pushTick above.
    const loop = () => {
      if (stopped) return;
      const target = targetRef.current;
      const cur = displayRef.current;
      if (target != null && cur != null) {
        const diff = target - cur;
        if (Math.abs(diff) > Math.abs(target) * 1e-7) {
          // Faster catch-up (was 0.2) so display doesn't visibly lag ticks.
          const next = cur + diff * 0.5;
          const settled = Math.abs(target - next) < Math.abs(target) * 1e-6;
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
