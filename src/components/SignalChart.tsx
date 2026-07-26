import { useEffect, useImperativeHandle, useRef, forwardRef, useState, useCallback } from "react";
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
import {
  MousePointer2,
  Minus,
  TrendingUp,
  Square,
  Type as TypeIcon,
  Ruler,
  Eraser,
  Trash2,
} from "lucide-react";

export type SignalChartHandle = {
  drawMarking: (m: Marking, opts?: { transient?: boolean }) => void;
  focusMarking: (m: Marking) => void;
  panToMarking: (m: Marking) => void;
  clear: () => void;
  clearTransient: () => void;
  updateLivePrice: (price: number, tSeconds?: number) => void;
};



type Props = {
  candles: CandleDTO[];
  tf: "htf" | "ltf";
  dark: boolean;
  title: string;
};

const COLORS = {
  fvgBull:      { fill: "rgba(34,197,94,0.18)",  border: "#16a34a", tag: "FVG+" },
  fvgBear:      { fill: "rgba(239,68,68,0.18)",  border: "#dc2626", tag: "FVG-" },
  obDemand:     { fill: "rgba(59,130,246,0.20)", border: "#2563eb", tag: "OB+"  },
  obSupply:     { fill: "rgba(244,114,182,0.22)",border: "#db2777", tag: "OB-"  },
  zoneDemand:   { fill: "rgba(34,197,94,0.14)",  border: "#16a34a", tag: "DEMAND" },
  zoneSupply:   { fill: "rgba(239,68,68,0.14)",  border: "#dc2626", tag: "SUPPLY" },
  breakerBull:  { fill: "rgba(20,184,166,0.20)", border: "#0d9488", tag: "BRK+" },
  breakerBear:  { fill: "rgba(217,70,239,0.20)", border: "#a21caf", tag: "BRK-" },
  premium:  "rgba(244,63,94,0.06)",
  discount: "rgba(16,185,129,0.06)",
  ote:      "rgba(234,179,8,0.14)",
  premiumBorder:  "#e11d48",
  discountBorder: "#059669",
  oteBorder:      "#ca8a04",
  bullLine: "#16a34a",
  bearLine: "#dc2626",
  liqBuy: "#f59e0b",
  liqSell: "#ea580c",
  eqh: "#9333ea",
  eql: "#9333ea",
  entry: "#2563eb",
  sl: "#dc2626",
  tp: "#059669",
};

// ---- Manual drawing types ----
type DrawTool = "cursor" | "hline" | "trend" | "rect" | "fib" | "measure" | "text" | "erase";
type Anchor = { time: number; price: number };
type UserDrawing =
  | { id: string; type: "hline"; a: Anchor; color: string }
  | { id: string; type: "trend"; a: Anchor; b: Anchor; color: string }
  | { id: string; type: "rect"; a: Anchor; b: Anchor; color: string }
  | { id: string; type: "fib"; a: Anchor; b: Anchor; color: string }
  | { id: string; type: "measure"; a: Anchor; b: Anchor; color: string }
  | { id: string; type: "text"; a: Anchor; text: string; color: string };

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const TOOL_COLOR = "#2563eb";

const SignalChart = forwardRef<SignalChartHandle, Props>(function SignalChart(
  { candles, tf, dark, title },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef = useRef<{ line: IPriceLine; transient: boolean }[]>([]);
  const markersRef = useRef<SeriesMarker<Time>[]>([]);
  const transientMarkerKeysRef = useRef<Set<string>>(new Set());
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // Box overlays drawn via DOM div absolutely positioned over chart
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxesRef = useRef<{ marking: Marking; el: HTMLDivElement; transient: boolean }[]>([]);
  // Floating text labels for price-line markings (liquidity, EQH/EQL, BOS/CHOCH, entry/sl/tp)
  const labelsRef = useRef<{ marking: Marking; price: number; color: string; el: HTMLDivElement; transient: boolean }[]>([]);
  // Live tick state — mutable, survives across ticks within the same bar
  const liveBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const bucketSecRef = useRef<number>(60);
  const lastPriceLineRef = useRef<IPriceLine | null>(null);

  // ---- Manual drawing state ----
  const drawSvgRef = useRef<SVGSVGElement>(null);
  const drawingsRef = useRef<UserDrawing[]>([]);
  const [tool, setTool] = useState<DrawTool>("cursor");
  const toolRef = useRef<DrawTool>("cursor");
  useEffect(() => { toolRef.current = tool; }, [tool]);
  const pendingRef = useRef<Anchor | null>(null);
  const previewRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceTick] = useState(0);
  const rerender = useCallback(() => forceTick((v) => v + 1), []);

  const anchorFromEvent = useCallback((ev: PointerEvent | React.PointerEvent): Anchor | null => {
    const chart = chartRef.current;
    const s = seriesRef.current;
    const svg = drawSvgRef.current;
    if (!chart || !s || !svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = (ev as PointerEvent).clientX - rect.left;
    const y = (ev as PointerEvent).clientY - rect.top;
    const ts = chart.timeScale();
    let t: number | null = null;
    const tRaw = ts.coordinateToTime(x);
    if (tRaw != null) {
      t = Number(tRaw);
    } else {
      // Fallback: derive time from logical index → allows drawing in blank right zone
      const logical = ts.coordinateToLogical(x);
      if (logical != null && liveBarRef.current) {
        const lastIdx = Math.max(0, (candles.length - 1));
        const delta = Number(logical) - lastIdx;
        t = Number(liveBarRef.current.time) + Math.round(delta) * (bucketSecRef.current || 60);
      }
    }
    const p = s.coordinateToPrice(y);
    if (t == null || p == null) return null;
    return { time: t, price: Number(p) };
  }, [candles.length]);

  const redrawUserDrawings = useCallback(() => {
    const svg = drawSvgRef.current;
    const chart = chartRef.current;
    const s = seriesRef.current;
    if (!svg || !chart || !s) return;
    const ts = chart.timeScale();
    const w = svg.clientWidth;
    const h = svg.clientHeight;
    const NS = "http://www.w3.org/2000/svg";
    // clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const px = (a: Anchor) => {
      const x = ts.timeToCoordinate(a.time as Time);
      const y = s.priceToCoordinate(a.price);
      return { x: x == null ? null : (x as unknown as number), y: y == null ? null : (y as number) };
    };
    for (const d of drawingsRef.current) {
      if (d.type === "hline") {
        const p = px(d.a);
        if (p.y == null) continue;
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", "0"); line.setAttribute("x2", String(w));
        line.setAttribute("y1", String(p.y)); line.setAttribute("y2", String(p.y));
        line.setAttribute("stroke", d.color); line.setAttribute("stroke-width", "1.4");
        line.setAttribute("stroke-dasharray", "6 4");
        svg.appendChild(line);
        const tag = document.createElementNS(NS, "rect");
        const label = d.a.price.toFixed(2);
        tag.setAttribute("x", String(w - 62)); tag.setAttribute("y", String(p.y - 9));
        tag.setAttribute("width", "58"); tag.setAttribute("height", "18");
        tag.setAttribute("rx", "3"); tag.setAttribute("fill", d.color);
        svg.appendChild(tag);
        const txt = document.createElementNS(NS, "text");
        txt.setAttribute("x", String(w - 33)); txt.setAttribute("y", String(p.y + 4));
        txt.setAttribute("text-anchor", "middle"); txt.setAttribute("fill", "#fff");
        txt.setAttribute("font-size", "10"); txt.setAttribute("font-family", "Google Sans, system-ui, sans-serif");
        txt.setAttribute("font-weight", "700");
        txt.textContent = label;
        svg.appendChild(txt);
      } else if (d.type === "trend" || d.type === "measure") {
        const a = px(d.a); const b = px(d.b);
        if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
        line.setAttribute("stroke", d.color); line.setAttribute("stroke-width", "1.6");
        line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line);
        // endpoints
        for (const p of [a, b]) {
          const c = document.createElementNS(NS, "circle");
          c.setAttribute("cx", String(p.x)); c.setAttribute("cy", String(p.y));
          c.setAttribute("r", "3"); c.setAttribute("fill", "#fff");
          c.setAttribute("stroke", d.color); c.setAttribute("stroke-width", "1.4");
          svg.appendChild(c);
        }
        if (d.type === "measure") {
          const diff = d.b.price - d.a.price;
          const pctText = d.a.price !== 0 ? ((diff / d.a.price) * 100).toFixed(2) + "%" : "";
          const label = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}  ${pctText}`;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 14;
          const bg = document.createElementNS(NS, "rect");
          const est = label.length * 6.2 + 16;
          bg.setAttribute("x", String(mx - est / 2)); bg.setAttribute("y", String(my - 11));
          bg.setAttribute("width", String(est)); bg.setAttribute("height", "18");
          bg.setAttribute("rx", "4"); bg.setAttribute("fill", diff >= 0 ? "#16a34a" : "#dc2626");
          svg.appendChild(bg);
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", String(mx)); t.setAttribute("y", String(my + 3));
          t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "#fff");
          t.setAttribute("font-size", "10"); t.setAttribute("font-weight", "700");
          t.setAttribute("font-family", "Google Sans, system-ui, sans-serif");
          t.textContent = label;
          svg.appendChild(t);
        }
      } else if (d.type === "rect") {
        const a = px(d.a); const b = px(d.b);
        if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
        const r = document.createElementNS(NS, "rect");
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        const width = Math.abs(b.x - a.x), height = Math.abs(b.y - a.y);
        r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
        r.setAttribute("width", String(width)); r.setAttribute("height", String(height));
        r.setAttribute("fill", d.color + "22");
        r.setAttribute("stroke", d.color); r.setAttribute("stroke-width", "1.2");
        svg.appendChild(r);
      } else if (d.type === "fib") {
        const a = px(d.a); const b = px(d.b);
        if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
        const priceHi = Math.max(d.a.price, d.b.price);
        const priceLo = Math.min(d.a.price, d.b.price);
        for (const lvl of FIB_LEVELS) {
          const price = priceHi - (priceHi - priceLo) * lvl;
          const y = s.priceToCoordinate(price);
          if (y == null) continue;
          const ln = document.createElementNS(NS, "line");
          ln.setAttribute("x1", String(x1)); ln.setAttribute("x2", String(x2));
          ln.setAttribute("y1", String(y)); ln.setAttribute("y2", String(y));
          ln.setAttribute("stroke", d.color); ln.setAttribute("stroke-width", "1");
          ln.setAttribute("stroke-dasharray", lvl === 0 || lvl === 1 ? "0" : "3 3");
          ln.setAttribute("opacity", "0.85");
          svg.appendChild(ln);
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", String(x1 + 4)); t.setAttribute("y", String((y as number) - 2));
          t.setAttribute("fill", d.color); t.setAttribute("font-size", "9");
          t.setAttribute("font-family", "Google Sans, system-ui, sans-serif");
          t.setAttribute("font-weight", "600");
          t.textContent = `${(lvl * 100).toFixed(1)}%  ${price.toFixed(2)}`;
          svg.appendChild(t);
        }
      } else if (d.type === "text") {
        const p = px(d.a);
        if (p.x == null || p.y == null) continue;
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String(p.x)); t.setAttribute("y", String(p.y));
        t.setAttribute("fill", d.color); t.setAttribute("font-size", "12");
        t.setAttribute("font-family", "Google Sans, system-ui, sans-serif");
        t.setAttribute("font-weight", "600");
        t.textContent = d.text;
        svg.appendChild(t);
      }
    }
    // preview stroke while placing second point
    const pending = pendingRef.current;
    const preview = previewRef.current;
    const t = toolRef.current;
    if (pending && preview && (t === "trend" || t === "rect" || t === "fib" || t === "measure")) {
      const a = px(pending);
      if (a.x != null && a.y != null) {
        if (t === "rect") {
          const r = document.createElementNS(NS, "rect");
          const x = Math.min(a.x, preview.x), y = Math.min(a.y, preview.y);
          const width = Math.abs(preview.x - a.x), height = Math.abs(preview.y - a.y);
          r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
          r.setAttribute("width", String(width)); r.setAttribute("height", String(height));
          r.setAttribute("fill", TOOL_COLOR + "18");
          r.setAttribute("stroke", TOOL_COLOR); r.setAttribute("stroke-width", "1");
          r.setAttribute("stroke-dasharray", "4 3");
          svg.appendChild(r);
        } else {
          const ln = document.createElementNS(NS, "line");
          ln.setAttribute("x1", String(a.x)); ln.setAttribute("y1", String(a.y));
          ln.setAttribute("x2", String(preview.x)); ln.setAttribute("y2", String(preview.y));
          ln.setAttribute("stroke", TOOL_COLOR); ln.setAttribute("stroke-width", "1.2");
          ln.setAttribute("stroke-dasharray", "4 3");
          svg.appendChild(ln);
        }
      }
    }
  }, []);

  const hitTest = useCallback((x: number, y: number): string | null => {
    const chart = chartRef.current;
    const s = seriesRef.current;
    if (!chart || !s) return null;
    const ts = chart.timeScale();
    const near = 6;
    const distToSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };
    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const d = drawingsRef.current[i];
      if (d.type === "hline") {
        const yy = s.priceToCoordinate(d.a.price);
        if (yy != null && Math.abs(y - (yy as number)) <= near) return d.id;
      } else if (d.type === "trend" || d.type === "measure" || d.type === "fib") {
        const ax = ts.timeToCoordinate(d.a.time as Time);
        const ay = s.priceToCoordinate(d.a.price);
        const bx = ts.timeToCoordinate(d.b.time as Time);
        const by = s.priceToCoordinate(d.b.price);
        if (ax == null || ay == null || bx == null || by == null) continue;
        if (distToSeg(x, y, ax as unknown as number, ay as number, bx as unknown as number, by as number) <= near) return d.id;
      } else if (d.type === "rect") {
        const ax = ts.timeToCoordinate(d.a.time as Time);
        const ay = s.priceToCoordinate(d.a.price);
        const bx = ts.timeToCoordinate(d.b.time as Time);
        const by = s.priceToCoordinate(d.b.price);
        if (ax == null || ay == null || bx == null || by == null) continue;
        const x1 = Math.min(ax as unknown as number, bx as unknown as number);
        const x2 = Math.max(ax as unknown as number, bx as unknown as number);
        const y1 = Math.min(ay as number, by as number);
        const y2 = Math.max(ay as number, by as number);
        // edges
        if (Math.abs(y - y1) <= near && x >= x1 - near && x <= x2 + near) return d.id;
        if (Math.abs(y - y2) <= near && x >= x1 - near && x <= x2 + near) return d.id;
        if (Math.abs(x - x1) <= near && y >= y1 - near && y <= y2 + near) return d.id;
        if (Math.abs(x - x2) <= near && y >= y1 - near && y <= y2 + near) return d.id;
      } else if (d.type === "text") {
        const ax = ts.timeToCoordinate(d.a.time as Time);
        const ay = s.priceToCoordinate(d.a.price);
        if (ax == null || ay == null) continue;
        if (Math.abs(x - (ax as unknown as number)) <= 40 && Math.abs(y - (ay as number)) <= 12) return d.id;
      }
    }
    return null;
  }, []);


  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: dark ? "#d4d4d8" : "#262626",
        fontFamily: '"Google Sans", "Product Sans", system-ui, sans-serif',
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
    series.setData(candles.map((c) => ({ ...c, time: Number(c.time) as Time })));
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;
    markersPluginRef.current = createSeriesMarkers(series, []);

    // Seed live-bar state from the latest candle and infer bar duration.
    const lastC = candles[candles.length - 1];
    const prevC = candles[candles.length - 2];
    if (lastC && prevC) bucketSecRef.current = Math.max(1, Number(lastC.time) - Number(prevC.time));
    liveBarRef.current = lastC
      ? { time: Number(lastC.time), open: lastC.open, high: lastC.high, low: lastC.low, close: lastC.close }
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

        const fromT = Number(m.fromTime);
        const toTRaw = Number(m.toTime);
        if (!Number.isFinite(fromT) || !Number.isFinite(toTRaw)) { b.el.style.display = "none"; continue; }
        // Extend the right edge ~8 bars forward so the zone reads as "live".
        const toT = toTRaw + (bucketSecRef.current || 60) * 8;
        const x1 = ts.timeToCoordinate(fromT as Time);
        const x2raw = ts.timeToCoordinate(toT as Time);
        if (x1 == null) { b.el.style.display = "none"; continue; }
        const x2 = (x2raw == null ? containerWidth : (x2raw as unknown as number));
        const x1n = x1 as unknown as number;
        b.el.style.display = "block";
        const left = Math.min(x1n, x2);
        const width = Math.max(2, Math.abs(x2 - x1n));
        const top = Math.min(y1, y2);
        const height = Math.max(2, Math.abs(y2 - y1));
        b.el.style.left = `${left}px`;
        b.el.style.top = `${top}px`;
        b.el.style.width = `${width}px`;
        b.el.style.height = `${height}px`;
      }
      // Reposition floating price-line labels — pin to right edge at price coordinate.
      for (const lb of labelsRef.current) {
        const y = seriesRef.current.priceToCoordinate(lb.price);
        if (y == null) { lb.el.style.display = "none"; continue; }
        lb.el.style.display = "block";
        lb.el.style.top = `${Math.max(2, y - 9)}px`;
        lb.el.style.right = `4px`;
      }
      redrawUserDrawings();
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(() => { redrawBoxes(); redrawUserDrawings(); });
    chart.subscribeCrosshairMove(redrawBoxes);
    const ro = new ResizeObserver(() => { redrawBoxes(); redrawUserDrawings(); });
    ro.observe(containerRef.current);
    (chartRef.current as any).__redrawBoxes = redrawBoxes;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current = [];
      markersRef.current = [];
      boxesRef.current = [];
      labelsRef.current = [];
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
      linesRef.current.forEach((l) => { try { s.removePriceLine(l.line); } catch {} });
      linesRef.current = [];
      markersRef.current = [];
      transientMarkerKeysRef.current.clear();
      markersPluginRef.current?.setMarkers([]);
      boxesRef.current.forEach((b) => b.el.remove());
      boxesRef.current = [];
      labelsRef.current.forEach((lb) => { try { lb.el.remove(); } catch {} });
      labelsRef.current = [];
      if (lastPriceLineRef.current) {
        try { s.removePriceLine(lastPriceLineRef.current); } catch {}
        lastPriceLineRef.current = null;
      }
    },
    clearTransient: () => {
      const s = seriesRef.current;
      if (!s) return;
      // Remove transient price lines, keep persistent ones (entry/sl/tp + static context)
      const keep: { line: IPriceLine; transient: boolean }[] = [];
      for (const l of linesRef.current) {
        if (l.transient) { try { s.removePriceLine(l.line); } catch {} }
        else keep.push(l);
      }
      linesRef.current = keep;
      // Remove transient overlay boxes
      const keepBoxes: typeof boxesRef.current = [];
      for (const b of boxesRef.current) {
        if (b.transient) {
          b.el.style.opacity = "0";
          const el = b.el;
          setTimeout(() => { try { el.remove(); } catch {} }, 260);
        } else keepBoxes.push(b);
      }
      boxesRef.current = keepBoxes;
      // Remove transient floating labels
      const keepLabels: typeof labelsRef.current = [];
      for (const lb of labelsRef.current) {
        if (lb.transient) {
          lb.el.style.opacity = "0";
          const el = lb.el;
          setTimeout(() => { try { el.remove(); } catch {} }, 260);
        } else keepLabels.push(lb);
      }
      labelsRef.current = keepLabels;
      // Remove transient markers (BOS/CHoCH arrows)
      if (transientMarkerKeysRef.current.size > 0) {
        const kept = markersRef.current.filter((mk) => {
          const key = `${mk.time}:${mk.text ?? ""}`;
          return !transientMarkerKeysRef.current.has(key);
        });
        markersRef.current = kept;
        transientMarkerKeysRef.current.clear();
        markersPluginRef.current?.setMarkers(kept);
      }
    },
    focusMarking: (m: Marking) => {
      const chart = chartRef.current;
      const s = seriesRef.current;
      if (!chart || !s) return;
      if (m.tf !== tf) return;
      const ts = chart.timeScale();
      const anyM: any = m;
      let from = Number(anyM.fromTime);
      let to = Number(anyM.toTime);
      const bucket = bucketSecRef.current || 60;
      // Price-only markings — synthesize a tight window around the live bar,
      // so liquidity / EQH / EQL / entry / sl / tp zoom in just like FVG/OB.
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        const lastT = liveBarRef.current?.time;
        if (typeof lastT === "number") {
          from = lastT - bucket * 6;
          to = lastT + bucket * 2;
        }
      }
      // User asked: don't zoom while drawing — keep the full chart visible.
      // We still pulse the marking below, but skip setVisibleRange.

      // Pulse the matching box (if any)
      const hit = boxesRef.current.find((b) => b.marking === m);
      if (hit) {
        const prev = hit.el.style.boxShadow;
        hit.el.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.55), 0 0 24px rgba(59,130,246,0.45)";
        hit.el.style.transition = "box-shadow 220ms ease, opacity 600ms ease";
        setTimeout(() => { try { hit.el.style.boxShadow = prev || "none"; } catch {} }, 1100);
      }
      // Pulse the matching price line — width flash to draw the eye.
      const anyPrice = (anyM.price ?? null) as number | null;
      if (anyPrice != null && overlayRef.current) {
        const y = s.priceToCoordinate(anyPrice);
        if (y != null) {
          const glow = document.createElement("div");
          const containerWidth = overlayRef.current.clientWidth;
          glow.style.cssText = `position:absolute;left:0;width:${containerWidth}px;top:${y - 14}px;height:28px;background:radial-gradient(ellipse at center, rgba(59,130,246,0.35), rgba(59,130,246,0) 70%);pointer-events:none;opacity:0;transition:opacity 220ms ease;`;
          overlayRef.current.appendChild(glow);
          requestAnimationFrame(() => { glow.style.opacity = "1"; });
          setTimeout(() => { glow.style.opacity = "0"; }, 900);
          setTimeout(() => { try { glow.remove(); } catch {} }, 1250);
        }
      }
    },
    panToMarking: (m: Marking) => {
      const chart = chartRef.current;
      if (!chart) return;
      if (m.tf !== tf) return;
      // User asked: don't zoom. Keep the full chart in view instead of
      // narrowing the visible range around the marking.
      try { chart.timeScale().fitContent(); } catch {}
    },


    drawMarking: (m: Marking, opts?: { transient?: boolean }) => {
      const s = seriesRef.current;
      const chart = chartRef.current;
      if (!s || !chart) return;
      if (m.tf !== tf) return;
      const transient = !!opts?.transient;

      // Box-style markings (FVG, OB, zone, breaker) — hand-drawn pastel style with inner pill label
      if (m.type === "fvg" || m.type === "orderBlock" || m.type === "zone" || m.type === "breaker") {
        if (!overlayRef.current) return;
        const el = document.createElement("div");
        let palette: { fill: string; border: string; tag: string };
        if (m.type === "fvg") {
          palette = m.kind === "bullish" ? COLORS.fvgBull : COLORS.fvgBear;
        } else if (m.type === "orderBlock") {
          palette = m.kind === "demand" ? COLORS.obDemand : COLORS.obSupply;
        } else if (m.type === "zone") {
          palette = m.kind === "demand" ? COLORS.zoneDemand : COLORS.zoneSupply;
        } else {
          palette = m.kind === "bullish" ? COLORS.breakerBull : COLORS.breakerBear;
        }
        el.style.cssText = `position:absolute;background:${palette.fill};border:1px solid ${palette.border};border-radius:2px;pointer-events:none;opacity:0;transition:opacity 500ms ease;overflow:hidden;`;
        const pill = document.createElement("span");
        pill.style.cssText = `position:absolute;top:2px;left:2px;font-size:9px;font-weight:700;letter-spacing:0.06em;padding:1px 5px;border-radius:3px;background:${palette.border};color:#fff;line-height:1.2;font-family:'Google Sans',system-ui,sans-serif;`;
        pill.textContent = palette.tag;
        el.appendChild(pill);
        overlayRef.current.appendChild(el);
        boxesRef.current.push({ marking: m, el, transient });
        (chart as any).__redrawBoxes?.();
        requestAnimationFrame(() => { el.style.opacity = "1"; });
        return;
      }

      // Full-width zones (Premium/Discount/OTE) — faint band + vertical right ribbon label
      if (m.type === "premiumZone" || m.type === "discountZone" || m.type === "oteZone") {
        if (!overlayRef.current) return;
        const el = document.createElement("div");
        const fill =
          m.type === "premiumZone" ? COLORS.premium :
          m.type === "discountZone" ? COLORS.discount : COLORS.ote;
        const border =
          m.type === "premiumZone" ? COLORS.premiumBorder :
          m.type === "discountZone" ? COLORS.discountBorder : COLORS.oteBorder;
        const tag = m.type === "premiumZone" ? "PREMIUM" : m.type === "discountZone" ? "DISCOUNT" : "OTE";
        el.style.cssText = `position:absolute;background:${fill};border-top:1px dashed ${border};border-bottom:1px dashed ${border};pointer-events:none;opacity:0;transition:opacity 600ms ease;`;
        const ribbon = document.createElement("span");
        ribbon.style.cssText = `position:absolute;right:0;top:50%;transform:translate(0,-50%) rotate(-90deg);transform-origin:right center;font-size:9px;font-weight:800;letter-spacing:0.18em;color:#fff;background:${border};padding:2px 8px;border-radius:3px;font-family:'Google Sans',system-ui,sans-serif;white-space:nowrap;`;
        ribbon.textContent = tag;
        el.appendChild(ribbon);
        overlayRef.current.appendChild(el);
        boxesRef.current.push({ marking: m, el, transient });
        (chart as any).__redrawBoxes?.();
        requestAnimationFrame(() => { el.style.opacity = "1"; });
        return;
      }

      // BOS / CHoCH — short dashed segment across the break level + small chip label
      if (m.type === "bos" || m.type === "choch") {
        const price = (m as any).price as number;
        const color = (m as any).kind === "bullish" ? COLORS.bullLine : COLORS.bearLine;
        const line = s.createPriceLine({
          price,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: m.type.toUpperCase(),
        });
        linesRef.current.push({ line, transient });
        // Right-edge label chip
        if (overlayRef.current) {
          const lbl = document.createElement("div");
          lbl.style.cssText = `position:absolute;pointer-events:none;font-size:10px;font-weight:700;letter-spacing:0.04em;padding:2px 7px;border-radius:10px;background:${color};color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0;transition:opacity 400ms ease;white-space:nowrap;font-family:'Google Sans',system-ui,sans-serif;`;
          lbl.textContent = m.type.toUpperCase();
          overlayRef.current.appendChild(lbl);
          labelsRef.current.push({ marking: m, price, color, el: lbl, transient });
          (chart as any).__redrawBoxes?.();
          requestAnimationFrame(() => { lbl.style.opacity = "1"; });
        }
        return;
      }

      // Liquidity / EQH / EQL / entry / sl / tp — dotted price line + floating pill label
      const anyM: any = m;
      if (typeof anyM.price === "number") {
        let color = "#334155";
        let label = m.type.toUpperCase();
        if (m.type === "liquidity") {
          color = anyM.kind === "buy" ? COLORS.liqBuy : COLORS.liqSell;
          label = anyM.kind === "buy" ? "BSL" : "SSL";
        } else if (m.type === "eqh") { color = COLORS.eqh; label = "EQH"; }
        else if (m.type === "eql") { color = COLORS.eql; label = "EQL"; }
        else if (m.type === "entry") { color = COLORS.entry; label = "ENTRY"; }
        else if (m.type === "sl") { color = COLORS.sl; label = "SL"; }
        else if (m.type === "tp") { color = COLORS.tp; label = "TP"; }
        const line = s.createPriceLine({
          price: anyM.price,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: label,
        });
        linesRef.current.push({ line, transient });
        if (overlayRef.current) {
          const lbl = document.createElement("div");
          lbl.style.cssText = `position:absolute;pointer-events:none;font-size:10px;font-weight:700;letter-spacing:0.04em;padding:2px 7px;border-radius:10px;background:${color};color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0;transition:opacity 400ms ease;white-space:nowrap;font-family:'Google Sans',system-ui,sans-serif;`;
        lbl.textContent = label;
        overlayRef.current.appendChild(lbl);
        labelsRef.current.push({ marking: m, price: anyM.price, color, el: lbl, transient });
        (chart as any).__redrawBoxes?.();
        requestAnimationFrame(() => { lbl.style.opacity = "1"; });
      }
    }
    },
  }));

  // ---- Pointer handlers for manual drawing ----
  const onPointerDown = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    const t = toolRef.current;
    if (t === "cursor") return;
    const rect = drawSvgRef.current!.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    if (t === "erase") {
      const id = hitTest(x, y);
      if (id) {
        drawingsRef.current = drawingsRef.current.filter((d) => d.id !== id);
        redrawUserDrawings();
      }
      return;
    }
    const anchor = anchorFromEvent(ev.nativeEvent);
    if (!anchor) return;
    const id = Math.random().toString(36).slice(2, 10);
    if (t === "hline") {
      drawingsRef.current.push({ id, type: "hline", a: anchor, color: TOOL_COLOR });
      redrawUserDrawings();
      return;
    }
    if (t === "text") {
      const text = window.prompt("Note text:", "");
      if (text && text.trim()) {
        drawingsRef.current.push({ id, type: "text", a: anchor, text: text.trim(), color: "#111827" });
        redrawUserDrawings();
      }
      return;
    }
    // Two-point tools — set first anchor, wait for second click
    if (!pendingRef.current) {
      pendingRef.current = anchor;
      previewRef.current = { x, y };
      redrawUserDrawings();
    } else {
      const a = pendingRef.current;
      const b = anchor;
      pendingRef.current = null;
      previewRef.current = null;
      if (t === "trend") drawingsRef.current.push({ id, type: "trend", a, b, color: TOOL_COLOR });
      else if (t === "rect") drawingsRef.current.push({ id, type: "rect", a, b, color: TOOL_COLOR });
      else if (t === "fib") drawingsRef.current.push({ id, type: "fib", a, b, color: "#a16207" });
      else if (t === "measure") drawingsRef.current.push({ id, type: "measure", a, b, color: "#0ea5e9" });
      redrawUserDrawings();
    }
  }, [anchorFromEvent, hitTest, redrawUserDrawings]);

  const onPointerMove = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    if (!pendingRef.current) return;
    const rect = drawSvgRef.current!.getBoundingClientRect();
    previewRef.current = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    redrawUserDrawings();
  }, [redrawUserDrawings]);

  const onPointerLeave = useCallback(() => {
    // keep pending anchor but drop preview so nothing "drags" off-chart
    if (pendingRef.current) {
      previewRef.current = null;
      redrawUserDrawings();
    }
  }, [redrawUserDrawings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pendingRef.current = null;
        previewRef.current = null;
        setTool("cursor");
        redrawUserDrawings();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redrawUserDrawings]);

  const tools: { id: DrawTool; label: string; Icon: typeof MousePointer2 }[] = [
    { id: "cursor",  label: "Cursor",         Icon: MousePointer2 },
    { id: "hline",   label: "Horizontal Line",Icon: Minus },
    { id: "trend",   label: "Trend Line",     Icon: TrendingUp },
    { id: "rect",    label: "Rectangle",      Icon: Square },
    { id: "fib",     label: "Fibonacci",      Icon: Ruler },
    { id: "measure", label: "Measure",        Icon: Ruler },
    { id: "text",    label: "Text Note",      Icon: TypeIcon },
    { id: "erase",   label: "Erase",          Icon: Eraser },
  ];

  const drawingActive = tool !== "cursor";
  rerender; // keep referenced

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-3 z-20 text-xs font-bold tracking-wider uppercase opacity-70">
        {title}
      </div>
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={overlayRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
      <svg
        ref={drawSvgRef}
        className="absolute inset-0"
        style={{
          pointerEvents: drawingActive ? "auto" : "none",
          cursor: tool === "cursor" ? "default" : tool === "erase" ? "not-allowed" : "crosshair",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />
      {/* Drawing toolbar */}
      <div className="absolute top-10 left-2 z-30 flex flex-col gap-1 rounded-xl border border-zinc-200/70 bg-white/95 backdrop-blur px-1 py-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)]">
        {tools.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => {
              setTool(id);
              pendingRef.current = null;
              previewRef.current = null;
              redrawUserDrawings();
            }}
            className={
              "h-7 w-7 inline-flex items-center justify-center rounded-md transition " +
              (tool === id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100")
            }
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="my-0.5 h-px w-full bg-zinc-200" />
        <button
          type="button"
          title="Clear all drawings"
          aria-label="Clear all drawings"
          onClick={() => {
            drawingsRef.current = [];
            pendingRef.current = null;
            previewRef.current = null;
            redrawUserDrawings();
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

export default SignalChart;
