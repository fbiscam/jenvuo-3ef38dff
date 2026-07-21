import { useEffect, useRef, useState } from "react";
import type { ChartDataResponse } from "@/lib/chart-data.functions";

type Props = {
  data: ChartDataResponse;
  visible: {
    fvg: boolean;
    orderBlock: boolean;
    breaker: boolean;
    structure: boolean;
    liquidity: boolean;
    equilibrium: boolean;
  };
};

// Client-only chart. Dynamically imports lightweight-charts inside useEffect
// so nothing browser-touching runs during SSR / module evaluation.
export default function AnnotatedChart({ data, visible }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cleanup: (() => void) | null = null;
    let disposed = false;

    (async () => {
      try {
        const mod = await import("lightweight-charts");
        if (disposed || !el) return;

        const { createChart, CandlestickSeries, LineStyle } = mod as typeof import("lightweight-charts");

        const chart = createChart(el, {
          layout: {
            background: { color: "#ffffff" },
            textColor: "#111827",
            fontFamily: "'Google Sans', system-ui, sans-serif",
          },
          grid: {
            vertLines: { color: "#f3f4f6" },
            horzLines: { color: "#f3f4f6" },
          },
          rightPriceScale: { borderColor: "#e5e7eb" },
          timeScale: { borderColor: "#e5e7eb", timeVisible: true, secondsVisible: false },
          crosshair: { mode: 1 },
          autoSize: true,
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#10b981",
          downColor: "#ef4444",
          borderUpColor: "#10b981",
          borderDownColor: "#ef4444",
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
          priceFormat: { type: "price", precision: data.decimals, minMove: 1 / Math.pow(10, data.decimals) },
        });

        series.setData(
          data.candles.map((c) => ({
            time: c.time as unknown as import("lightweight-charts").UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );

        // Zone rendering: pair of horizontal price lines top+bottom to form
        // a band. Colors follow bias. Mitigated zones drawn dashed & faded.
        const zoneColor = (kind: string, bias: string, mitigated: boolean) => {
          const base = (() => {
            if (kind === "orderBlock") return bias === "demand" ? "#10b981" : "#ef4444";
            if (kind === "breaker") return bias === "bullish" ? "#0ea5e9" : "#f97316";
            if (kind === "ifvg") return bias === "bullish" ? "#8b5cf6" : "#a855f7";
            // fvg
            return bias === "bullish" ? "#22c55e" : "#f43f5e";
          })();
          return mitigated ? `${base}66` : base;
        };

        if (visible.fvg || visible.orderBlock || visible.breaker) {
          for (const z of data.zones) {
            if (z.kind === "fvg" && !visible.fvg) continue;
            if (z.kind === "orderBlock" && !visible.orderBlock) continue;
            if ((z.kind === "breaker" || z.kind === "ifvg") && !visible.breaker) continue;
            const color = zoneColor(z.kind, z.bias, z.mitigated);
            series.createPriceLine({
              price: z.priceHigh,
              color,
              lineWidth: 1,
              lineStyle: z.mitigated ? LineStyle.Dotted : LineStyle.Solid,
              axisLabelVisible: true,
              title: `${z.label}${z.mitigated ? " (mit)" : ""}`,
            });
            series.createPriceLine({
              price: z.priceLow,
              color,
              lineWidth: 1,
              lineStyle: z.mitigated ? LineStyle.Dotted : LineStyle.Solid,
              axisLabelVisible: false,
              title: "",
            });
          }
        }

        // Liquidity pools — dashed lines with side label (BSL / SSL).
        if (visible.liquidity) {
          for (const l of data.liquidity) {
            series.createPriceLine({
              price: l.price,
              color: l.side === "buy" ? "#f59e0b" : "#3b82f6",
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `${l.label}${l.swept ? " (swept)" : ""}`,
            });
          }
        }

        // Structure markers (BOS / CHoCH) — placed on the candle at fromTime.
        if (visible.structure && data.structure.length) {
          type Marker = {
            time: import("lightweight-charts").UTCTimestamp;
            position: "aboveBar" | "belowBar";
            color: string;
            shape: "arrowUp" | "arrowDown";
            text: string;
          };
          const markers: Marker[] = data.structure.map((s) => ({
            time: s.fromTime as unknown as import("lightweight-charts").UTCTimestamp,
            position: s.dir === "bullish" ? "belowBar" : "aboveBar",
            color: s.dir === "bullish" ? "#10b981" : "#ef4444",
            shape: s.dir === "bullish" ? "arrowUp" : "arrowDown",
            text: s.label,
          }));
          // lightweight-charts v5 exposes markers via createSeriesMarkers primitive
          try {
            const createSeriesMarkers = (mod as unknown as { createSeriesMarkers?: (s: unknown, m: Marker[]) => unknown }).createSeriesMarkers;
            if (typeof createSeriesMarkers === "function") {
              createSeriesMarkers(series, markers);
            }
          } catch {
            /* markers optional */
          }
        }

        // Equilibrium + swing bounds
        if (visible.equilibrium && data.equilibrium > 0) {
          series.createPriceLine({
            price: data.equilibrium,
            color: "#6b7280",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Equilibrium`,
          });
          if (data.swingHigh > 0) {
            series.createPriceLine({
              price: data.swingHigh,
              color: "#9ca3af",
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `HTF High`,
            });
          }
          if (data.swingLow > 0) {
            series.createPriceLine({
              price: data.swingLow,
              color: "#9ca3af",
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `HTF Low`,
            });
          }
        }

        chart.timeScale().fitContent();

        cleanup = () => {
          try { chart.remove(); } catch { /* noop */ }
        };
      } catch (e) {
        setErr((e as Error)?.message || "Chart failed to load");
      }
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [data, visible]);

  return (
    <div className="relative w-full h-[560px] bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div ref={hostRef} className="absolute inset-0" />
      {err && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600 bg-white/80">
          {err}
        </div>
      )}
    </div>
  );
}
