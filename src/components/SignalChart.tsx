import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  type IPriceLine,
  type SeriesMarker,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { CandleDTO, Marking } from "@/lib/gold-analysis.functions";

export type SignalChartHandle = {
  drawMarking: (m: Marking) => void;
  focusMarking: (m: Marking) => void;
  clear: () => void;
  updateLivePrice: (price: number, tSeconds?: number) => void;
};


type Props = {
  candles: CandleDTO[];
  tf: "htf" | "ltf";
  dark: boolean;
  title: string;
};

const COLORS = {
  fvgBull: "rgba(34,197,94,0.22)",
  fvgBear: "rgba(239,68,68,0.22)",
  obDemand: "rgba(59,130,246,0.28)",
  obSupply: "rgba(244,114,182,0.28)",
  zoneDemand: "rgba(16,185,129,0.18)",
  zoneSupply: "rgba(244,63,94,0.18)",
  premium: "rgba(244,63,94,0.08)",
  discount: "rgba(16,185,129,0.08)",
  ote: "rgba(234,179,8,0.20)",
  breakerBull: "rgba(20,184,166,0.25)",
  breakerBear: "rgba(217,70,239,0.25)",
  bullLine: "#22c55e",
  bearLine: "#ef4444",
  liqBuy: "#fbbf24",
  liqSell: "#f97316",
  eqh: "#a855f7",
  eql: "#a855f7",
  entry: "#3b82f6",
  sl: "#ef4444",
  tp: "#10b981",
};

const SignalChart = forwardRef<SignalChartHandle, Props>(function SignalChart(
  { candles, tf, dark, title },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const markersRef = useRef<SeriesMarker<Time>[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // Box overlays drawn via DOM div absolutely positioned over chart
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxesRef = useRef<{ marking: Marking; el: HTMLDivElement }[]>([]);
  // Live tick state — mutable, survives across ticks within the same bar
  const liveBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const bucketSecRef = useRef<number>(60);
  const lastPriceLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: dark ? "#d4d4d8" : "#262626",
        fontFamily: "Urbanist, sans-serif",
      },
      grid: {
        vertLines: { color: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
        horzLines: { color: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    series.setData(candles.map((c) => ({ ...c, time: c.time as Time })));
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;
    markersPluginRef.current = createSeriesMarkers(series, []);

    // Seed live-bar state from the latest candle and infer bar duration.
    const lastC = candles[candles.length - 1];
    const prevC = candles[candles.length - 2];
    if (lastC && prevC) bucketSecRef.current = Math.max(1, lastC.time - prevC.time);
    liveBarRef.current = lastC
      ? { time: lastC.time, open: lastC.open, high: lastC.high, low: lastC.low, close: lastC.close }
      : null;

    const redrawBoxes = () => {
      if (!overlayRef.current || !seriesRef.current || !chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const containerWidth = overlayRef.current.clientWidth;
      for (const b of boxesRef.current) {
        const m: any = b.marking;
        const y1 = seriesRef.current.priceToCoordinate(m.priceHigh);
        const y2 = seriesRef.current.priceToCoordinate(m.priceLow);
        if (y1 == null || y2 == null) { b.el.style.display = "none"; continue; }

        // Full-width zones (premium / discount / OTE) — no fromTime
        if (m.type === "premiumZone" || m.type === "discountZone" || m.type === "oteZone") {
          b.el.style.display = "block";
          b.el.style.left = "0px";
          b.el.style.width = `${containerWidth}px`;
          const top = Math.min(y1, y2);
          const height = Math.max(2, Math.abs(y2 - y1));
          b.el.style.top = `${top}px`;
          b.el.style.height = `${height}px`;
          continue;
        }

        if (m.fromTime == null || m.toTime == null) { b.el.style.display = "none"; continue; }
        const x1 = ts.timeToCoordinate(m.fromTime as Time);
        const x2 = ts.timeToCoordinate(m.toTime as Time);
        if (x1 == null || x2 == null) { b.el.style.display = "none"; continue; }
        b.el.style.display = "block";
        const left = Math.min(x1, x2);
        const width = Math.max(2, Math.abs(x2 - x1));
        const top = Math.min(y1, y2);
        const height = Math.max(2, Math.abs(y2 - y1));
        b.el.style.left = `${left}px`;
        b.el.style.top = `${top}px`;
        b.el.style.width = `${width}px`;
        b.el.style.height = `${height}px`;
      }
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(redrawBoxes);
    chart.subscribeCrosshairMove(redrawBoxes);
    const ro = new ResizeObserver(redrawBoxes);
    if (containerRef.current) ro.observe(containerRef.current);
    (chartRef.current as any).__redrawBoxes = redrawBoxes;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current = [];
      markersRef.current = [];
      boxesRef.current = [];
      liveBarRef.current = null;
      lastPriceLineRef.current = null;
      if (overlayRef.current) overlayRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, dark]);

  useImperativeHandle(ref, () => ({
    updateLivePrice: (price: number, tSeconds?: number) => {
      const s = seriesRef.current;
      if (!s) return;
      const bar = liveBarRef.current;
      if (!bar) return;
      const bucket = bucketSecRef.current || 60;
      const nowSec = typeof tSeconds === "number" && Number.isFinite(tSeconds)
        ? Math.floor(tSeconds)
        : Math.floor(Date.now() / 1000);
      // Align the incoming time to the same bucket grid as the seeded bar.
      const aligned = bar.time + Math.floor((nowSec - bar.time) / bucket) * bucket;
      try {
        if (aligned > bar.time) {
          // Roll forward: open a fresh bar at the next bucket boundary.
          const next = { time: aligned, open: price, high: price, low: price, close: price };
          liveBarRef.current = next;
          s.update({ time: next.time as Time, open: next.open, high: next.high, low: next.low, close: next.close });
        } else {
          // Same bar: extend high/low, set close.
          bar.high = Math.max(bar.high, price);
          bar.low = Math.min(bar.low, price);
          bar.close = price;
          s.update({ time: bar.time as Time, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
        }
        // Sticky "LAST" price marker on the axis — recreated each tick.
        if (lastPriceLineRef.current) {
          try { s.removePriceLine(lastPriceLineRef.current); } catch {}
          lastPriceLineRef.current = null;
        }
        lastPriceLineRef.current = s.createPriceLine({
          price,
          color: "#0ea5e9",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "LAST",
        });
      } catch {}
    },
    clear: () => {

      const s = seriesRef.current;
      if (!s) return;
      linesRef.current.forEach((l) => s.removePriceLine(l));
      linesRef.current = [];
      markersRef.current = [];
      markersPluginRef.current?.setMarkers([]);
      boxesRef.current.forEach((b) => b.el.remove());
      boxesRef.current = [];
      if (lastPriceLineRef.current) {
        try { s.removePriceLine(lastPriceLineRef.current); } catch {}
        lastPriceLineRef.current = null;
      }
    },
    focusMarking: (m: Marking) => {
      const chart = chartRef.current;
      if (!chart) return;
      if (m.tf !== tf) return;
      const ts = chart.timeScale();
      const anyM: any = m;
      const from: number | undefined = anyM.fromTime;
      const to: number | undefined = anyM.toTime;
      try {
        if (typeof from === "number" && typeof to === "number") {
          const span = Math.max(to - from, 60);
          const pad = Math.max(span * 6, 60 * 30);
          ts.setVisibleRange({ from: (from - pad) as Time, to: (to + pad) as Time });
        }
      } catch {}
      // pulse the matching box (if any)
      const hit = boxesRef.current.find((b) => b.marking === m);
      if (hit) {
        const prev = hit.el.style.boxShadow;
        hit.el.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.55), 0 0 24px rgba(59,130,246,0.45)";
        hit.el.style.transition = "box-shadow 220ms ease";
        setTimeout(() => { try { hit.el.style.boxShadow = prev || "none"; } catch {} }, 1100);
      }
    },
    drawMarking: (m: Marking) => {
      const s = seriesRef.current;
      const chart = chartRef.current;
      if (!s || !chart) return;
      if (m.tf !== tf) return;

      // Box-style markings (FVG, OB, zone, breaker)
      if (m.type === "fvg" || m.type === "orderBlock" || m.type === "zone" || m.type === "breaker") {
        if (!overlayRef.current) return;
        const el = document.createElement("div");
        let color: string;
        let border: string;
        if (m.type === "fvg") {
          color = m.kind === "bullish" ? COLORS.fvgBull : COLORS.fvgBear;
          border = m.kind === "bullish" ? "#22c55e" : "#ef4444";
        } else if (m.type === "orderBlock") {
          color = m.kind === "demand" ? COLORS.obDemand : COLORS.obSupply;
          border = m.kind === "demand" ? "#3b82f6" : "#f472b6";
        } else if (m.type === "zone") {
          color = m.kind === "demand" ? COLORS.zoneDemand : COLORS.zoneSupply;
          border = m.kind === "demand" ? "#10b981" : "#f43f5e";
        } else {
          color = m.kind === "bullish" ? COLORS.breakerBull : COLORS.breakerBear;
          border = m.kind === "bullish" ? "#14b8a6" : "#d946ef";
        }
        el.style.cssText = `position:absolute;background:${color};border:1px dashed ${border};border-radius:3px;pointer-events:none;opacity:0;transition:opacity 600ms ease;font-size:10px;color:${dark ? "#fff" : "#000"};padding:2px 4px;font-weight:600;`;
        el.textContent = m.label;
        overlayRef.current.appendChild(el);
        boxesRef.current.push({ marking: m, el });
        (chart as any).__redrawBoxes?.();
        requestAnimationFrame(() => { el.style.opacity = "1"; });
        return;
      }

      // Full-width zones (Premium/Discount/OTE)
      if (m.type === "premiumZone" || m.type === "discountZone" || m.type === "oteZone") {
        if (!overlayRef.current) return;
        const el = document.createElement("div");
        const color =
          m.type === "premiumZone" ? COLORS.premium :
          m.type === "discountZone" ? COLORS.discount : COLORS.ote;
        const border =
          m.type === "premiumZone" ? "rgba(244,63,94,0.4)" :
          m.type === "discountZone" ? "rgba(16,185,129,0.4)" : "rgba(234,179,8,0.6)";
        el.style.cssText = `position:absolute;background:${color};border-top:1px dashed ${border};border-bottom:1px dashed ${border};pointer-events:none;opacity:0;transition:opacity 600ms ease;font-size:9px;color:${dark ? "#fff" : "#000"};padding:1px 6px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;`;
        el.textContent = m.label;
        overlayRef.current.appendChild(el);
        boxesRef.current.push({ marking: m, el });
        (chart as any).__redrawBoxes?.();
        requestAnimationFrame(() => { el.style.opacity = "1"; });
        return;
      }

      // Line markings (liquidity, EQH/EQL, BOS/CHOCH, entry/sl/tp)
      let color = COLORS.entry;
      let style: LineStyle = LineStyle.Solid;
      let price = 0;
      let lineWidth: 1 | 2 | 3 | 4 = 2;
      const title = m.label;
      if (m.type === "liquidity") {
        price = m.price;
        color = m.side === "buy" ? COLORS.liqBuy : COLORS.liqSell;
        style = LineStyle.Dashed;
      } else if (m.type === "eqh" || m.type === "eql") {
        price = m.price;
        color = m.type === "eqh" ? COLORS.eqh : COLORS.eql;
        style = LineStyle.Dotted;
        lineWidth = 1;
      } else if (m.type === "bos" || m.type === "choch") {
        price = m.price;
        color = m.kind === "bullish" ? COLORS.bullLine : COLORS.bearLine;
        style = LineStyle.LargeDashed;
        markersRef.current.push({
          time: m.fromTime as Time,
          position: m.kind === "bullish" ? "belowBar" : "aboveBar",
          color,
          shape: m.kind === "bullish" ? "arrowUp" : "arrowDown",
          text: m.type.toUpperCase(),
        });
        markersPluginRef.current?.setMarkers(markersRef.current);
      } else if (m.type === "entry") {
        price = m.price; color = COLORS.entry; lineWidth = 3;
      } else if (m.type === "sl") {
        price = m.price; color = COLORS.sl; lineWidth = 3;
      } else if (m.type === "tp") {
        price = m.price; color = COLORS.tp; lineWidth = 3;
      }

      const line = s.createPriceLine({
        price, color, lineWidth, lineStyle: style,
        axisLabelVisible: true, title,
      });
      linesRef.current.push(line);
    },
  }));

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-3 z-20 text-xs font-bold tracking-wider uppercase opacity-70">
        {title}
      </div>
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={overlayRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
    </div>
  );
});

export default SignalChart;
