import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  SINGLE_POINT_TOOLS,
  hitTest,
  renderDrawing,
  type Anchor,
  type Drawing,
  type DrawingTool,
  type Projector,
} from "@/lib/chart/drawings";
import { renderSmcOverlay, type SmcOverlay, type SmcToggles } from "@/lib/chart/smc-overlay";
import type { OhlcvBar } from "@/lib/chart/indicators";
import type { CandleProjection } from "@/lib/chart/projection";
import type { ScriptResult } from "@/lib/chart/jenvu-script";
import { buildIndicatorSeries, type IndicatorId } from "./indicator-specs";

export const CHART_COLORS = {
  bg: "#ffffff",
  text: "#131722",
  grid: "#f0f3fa",
  border: "#e0e3eb",
  up: "#089981",
  down: "#f23645",
};

export type ChartCanvasHandle = {
  snapshot: (header: string) => string | null;
  visibleWindow: () => { from: number; to: number; lo: number; hi: number } | null;
  fit: () => void;
};

type Props = {
  bars: OhlcvBar[];
  stepSeconds: number;
  indicators: IndicatorId[];
  scripts: Array<{ id: string; result: ScriptResult }>;
  smc: SmcOverlay | null;
  smcToggles: SmcToggles;
  projection: CandleProjection | null;
  drawings: Drawing[];
  drawingsVisible: boolean;
  tool: DrawingTool;
  color: string;
  magnet: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDrawingsChange: (next: Drawing[]) => void;
  onToolDone: () => void;
  onHoverBar: (index: number | null) => void;
  resetKey: string;
};

const uid = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const ChartCanvas = forwardRef<ChartCanvasHandle, Props>(function ChartCanvas(props, ref) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const ghostRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ghostMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const extraSeriesRef = useRef<ISeriesApi<"Line" | "Histogram">[]>([]);
  const candlePriceLinesRef = useRef<IPriceLine[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;
  const pendingRef = useRef<Drawing | null>(null);
  const dragRef = useRef<{ id: string; handle: number | null; start: Anchor; original: Anchor[]; moved: boolean } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const draftRef = useRef<Drawing[] | null>(null);
  const dirtyRef = useRef(0);
  const lastBarsRef = useRef<{ first: number; len: number } | null>(null);

  // ------------------------------------------------------------- coordinates
  const timeToX = (t: number): number | null => {
    const chart = chartRef.current;
    const { bars, stepSeconds } = propsRef.current;
    if (!chart || !bars.length) return null;
    const last = bars.length - 1;
    let logical: number;
    if (t <= bars[0].time) logical = (t - bars[0].time) / stepSeconds;
    else if (t >= bars[last].time) logical = last + (t - bars[last].time) / stepSeconds;
    else {
      let lo = 0;
      let hi = last;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (bars[mid].time <= t) lo = mid;
        else hi = mid;
      }
      const span = bars[lo + 1].time - bars[lo].time || stepSeconds;
      logical = lo + (t - bars[lo].time) / span;
    }
    const x = chart.timeScale().logicalToCoordinate(logical as never);
    return x == null ? null : Number(x);
  };

  const xToTime = (x: number, snap = true): number | null => {
    const chart = chartRef.current;
    const { bars, stepSeconds } = propsRef.current;
    if (!chart || !bars.length) return null;
    const raw = chart.timeScale().coordinateToLogical(x);
    if (raw == null) return null;
    const logical = snap ? Math.round(Number(raw)) : Number(raw);
    const last = bars.length - 1;
    if (logical <= 0) return bars[0].time + logical * stepSeconds;
    if (logical >= last) return bars[last].time + (logical - last) * stepSeconds;
    const i = Math.floor(logical);
    const frac = logical - i;
    return bars[i].time + frac * (bars[i + 1].time - bars[i].time);
  };

  const priceToY = (p: number): number | null => {
    const y = candleRef.current?.priceToCoordinate(p);
    return y == null ? null : Number(y);
  };
  const yToPrice = (y: number): number | null => {
    const p = candleRef.current?.coordinateToPrice(y);
    return p == null ? null : Number(p);
  };

  const mainArea = () => {
    const chart = chartRef.current;
    if (!chart) return { width: 0, height: 0 };
    return { width: chart.timeScale().width(), height: chart.panes()[0]?.getHeight() ?? 0 };
  };

  const projector = (): Projector => {
    const area = mainArea();
    return { x: timeToX, y: priceToY, width: area.width, height: area.height };
  };

  const anchorAt = (x: number, y: number): Anchor | null => {
    const t = xToTime(x);
    let p = yToPrice(y);
    if (t == null || p == null) return null;
    const { magnet, bars } = propsRef.current;
    if (magnet) {
      const bar = bars.find((b) => b.time === t);
      if (bar) {
        const candidates = [bar.open, bar.high, bar.low, bar.close];
        let best = candidates[0];
        for (const c of candidates) if (Math.abs((priceToY(c) ?? 1e9) - y) < Math.abs((priceToY(best) ?? 1e9) - y)) best = c;
        if (Math.abs((priceToY(best) ?? 1e9) - y) < 24) p = best;
      }
    }
    return { t, p: Math.round(p * 100) / 100 };
  };

  // ------------------------------------------------------------- chart setup
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 11,
        panes: { separatorColor: CHART_COLORS.border, enableResize: true },
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.border },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
      },
      // Fixed locale: some browsers report tags like "en-US@posix" that make
      // Intl throw and stop the chart from drawing candles.
      localization: { locale: "en-US", priceFormatter: (p: number) => p.toFixed(2) },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    chartRef.current = chart;
    candleRef.current = candles;
    markersRef.current = createSeriesMarkers(candles, []);
    const ghost = chart.addSeries(CandlestickSeries, {
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    ghostRef.current = ghost;
    ghostMarkersRef.current = createSeriesMarkers(ghost, []);

    const bump = () => (dirtyRef.current += 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(bump);
    chart.subscribeCrosshairMove((param) => {
      bump();
      const logical = param.logical;
      propsRef.current.onHoverBar(logical == null ? null : Number(logical));
    });
    chart.subscribeClick((param) => {
      if (propsRef.current.tool !== "cursor" || !param.point) return;
      const hit = hitTest(visibleDrawings(), projector(), param.point.x, param.point.y);
      propsRef.current.onSelect(hit?.id ?? null);
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      markersRef.current = null;
      ghostRef.current = null;
      ghostMarkersRef.current = null;
      extraSeriesRef.current = [];
      lastBarsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleDrawings = () => {
    const p = propsRef.current;
    if (!p.drawingsVisible) return [];
    return draftRef.current ?? p.drawings;
  };

  // ------------------------------------------------------------- candle data
  useEffect(() => {
    const candles = candleRef.current;
    if (!candles) return;
    const { bars } = props;
    const data = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    const prev = lastBarsRef.current;
    const first = bars[0]?.time ?? 0;
    if (prev && prev.first === first && bars.length >= prev.len && bars.length - prev.len <= 2 && prev.len > 0) {
      for (let i = Math.max(0, prev.len - 1); i < data.length; i++) candles.update(data[i]);
    } else {
      candles.setData(data);
    }
    lastBarsRef.current = { first, len: bars.length };
    dirtyRef.current += 1;
  }, [props.bars]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------- scenario ghost candles
  useEffect(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    const proj = props.projection;
    if (!proj) {
      ghost.setData([]);
      ghostMarkersRef.current?.setMarkers([]);
      return;
    }
    ghost.setData(
      proj.candles.map((c) => {
        const col = c.bullish ? "rgba(8,153,129,0.35)" : "rgba(242,54,69,0.35)";
        const edge = c.bullish ? "rgba(8,153,129,0.8)" : "rgba(242,54,69,0.8)";
        return { time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close, color: col, borderColor: edge, wickColor: edge };
      }),
    );
    ghostMarkersRef.current?.setMarkers([]);
  }, [props.projection]);

  useEffect(() => {
    // Timeframe switch: show the most recent ~150 bars.
    const chart = chartRef.current;
    if (!chart) return;
    lastBarsRef.current = null;
    const id = window.setTimeout(() => {
      const n = propsRef.current.bars.length;
      if (n > 0) chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 150), to: n + 8 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [props.resetKey]);

  // ------------------------------------------------------ indicators + scripts
  const indicatorKey = props.indicators.join(",");
  const scriptKey = props.scripts
    .map((s) => `${s.id}:${s.result.overlay}:${s.result.plots.length}:${s.result.hlines.length}:${s.result.plots.map((p) => p.color).join("/")}`)
    .join("|");

  useEffect(() => {
    const chart = chartRef.current;
    const candles = candleRef.current;
    if (!chart || !candles) return;
    for (const s of extraSeriesRef.current) chart.removeSeries(s);
    extraSeriesRef.current = [];
    candlePriceLinesRef.current.forEach((l) => candles.removePriceLine(l));
    candlePriceLinesRef.current = [];
    while (chart.panes().length > 1) chart.removePane(chart.panes().length - 1);

    const { bars } = propsRef.current;
    let nextPane = 1;
    const updaters: Array<(b: OhlcvBar[]) => void> = [];

    for (const id of propsRef.current.indicators) {
      const spec = buildIndicatorSeries(id);
      const pane = spec.pane === "main" ? 0 : spec.pane === "volume" ? 0 : nextPane++;
      const created = spec.lines.map((line) => {
        const s =
          line.kind === "histogram"
            ? chart.addSeries(
                HistogramSeries,
                {
                  color: line.color,
                  priceScaleId: spec.pane === "volume" ? "volume" : undefined,
                  lastValueVisible: spec.pane !== "volume",
                  priceLineVisible: false,
                  title: spec.pane === "volume" ? "" : line.title,
                },
                pane,
              )
            : chart.addSeries(
                LineSeries,
                {
                  color: line.color,
                  lineWidth: (line.width ?? 1) as 1,
                  priceLineVisible: false,
                  lastValueVisible: true,
                  crosshairMarkerVisible: false,
                  title: line.title,
                  lineStyle: line.dashed ? LineStyle.Dashed : LineStyle.Solid,
                },
                pane,
              );
        if (spec.pane === "volume") {
          chart.priceScale("volume", 0).applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        }
        return s;
      });
      spec.levels?.forEach((lvl) =>
        created[0]?.createPriceLine({
          price: lvl.price,
          color: lvl.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        }),
      );
      extraSeriesRef.current.push(...(created as ISeriesApi<"Line" | "Histogram">[]));
      updaters.push((b) => {
        const values = spec.compute(b);
        created.forEach((s, i) => {
          const vals = values[i];
          const line = spec.lines[i];
          s.setData(
            b.map((bar, j) => {
              const v = vals[j];
              if (!Number.isFinite(v)) return { time: bar.time as UTCTimestamp };
              if (line.kind === "histogram") {
                const color = line.colorFor ? line.colorFor(bar, v) : line.color;
                return { time: bar.time as UTCTimestamp, value: v, color };
              }
              return { time: bar.time as UTCTimestamp, value: v };
            }) as never,
          );
        });
      });
    }

    for (const script of propsRef.current.scripts) {
      const pane = script.result.overlay ? 0 : nextPane++;
      const created = script.result.plots.map((plot) =>
        chart.addSeries(
          LineSeries,
          {
            color: plot.color,
            lineWidth: plot.lineWidth as 1,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: false,
            title: plot.title,
          },
          pane,
        ),
      );
      const host: ISeriesApi<"Line"> | ISeriesApi<"Candlestick"> | null =
        created[0] ?? (script.result.overlay ? candles : null);
      script.result.hlines.forEach((h) => {
        const line = host?.createPriceLine({
          price: h.price,
          color: h.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: h.title,
        });
        if (line && !created[0]) candlePriceLinesRef.current.push(line);
      });
      extraSeriesRef.current.push(...created);
    }

    chart.panes().forEach((p, i) => p.setStretchFactor(i === 0 ? 3.2 : 1));
    for (const u of updaters) u(bars);
    applyScriptData();
    dirtyRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorKey, scriptKey]);

  const indicatorUpdateRef = useRef<() => void>(() => {});
  const applyScriptData = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const { bars, scripts, indicators } = propsRef.current;
    // Script series are appended after indicator series.
    let offset = 0;
    for (const id of indicators) offset += buildIndicatorSeries(id).lines.length;
    for (const script of scripts) {
      script.result.plots.forEach((plot) => {
        const s = extraSeriesRef.current[offset++];
        if (!s) return;
        s.setData(
          bars.map((bar, j) => {
            const v = plot.values[j];
            if (!Number.isFinite(v)) return { time: bar.time as UTCTimestamp };
            const color = plot.colors?.[j];
            return color
              ? { time: bar.time as UTCTimestamp, value: v, color }
              : { time: bar.time as UTCTimestamp, value: v };
          }) as never,
        );
      });
    }
    const markers: SeriesMarker<Time>[] = [];
    for (const script of scripts) {
      for (const shape of script.result.shapes) {
        for (const i of shape.bars.slice(-300)) {
          const bar = bars[i];
          if (!bar) continue;
          markers.push({
            time: bar.time as UTCTimestamp,
            position: shape.location === "above" ? "aboveBar" : "belowBar",
            color: shape.color,
            shape: shape.shape,
            text: shape.text || undefined,
          });
        }
      }
    }
    markers.sort((a, b) => Number(a.time) - Number(b.time));
    markersRef.current?.setMarkers(markers);
  };

  indicatorUpdateRef.current = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const { bars, indicators } = propsRef.current;
    let offset = 0;
    for (const id of indicators) {
      const spec = buildIndicatorSeries(id);
      const values = spec.compute(bars);
      spec.lines.forEach((line, i) => {
        const s = extraSeriesRef.current[offset + i];
        if (!s) return;
        const vals = values[i];
        s.setData(
          bars.map((bar, j) => {
            const v = vals[j];
            if (!Number.isFinite(v)) return { time: bar.time as UTCTimestamp };
            if (line.kind === "histogram")
              return { time: bar.time as UTCTimestamp, value: v, color: line.colorFor ? line.colorFor(bar, v) : line.color };
            return { time: bar.time as UTCTimestamp, value: v };
          }) as never,
        );
      });
      offset += spec.lines.length;
    }
  };

  useEffect(() => {
    indicatorUpdateRef.current();
    applyScriptData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.bars, props.scripts]);

  // ------------------------------------------------------------- overlay loop
  useEffect(() => {
    let raf = 0;
    let lastSig = "";
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const chart = chartRef.current;
      if (!canvas || !wrap || !chart) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const range = chart.timeScale().getVisibleLogicalRange();
      const sig = `${w}x${h}|${range?.from}|${range?.to}|${priceToY(1000)}|${priceToY(5000)}|${dirtyRef.current}|${mainArea().height}`;
      if (sig === lastSig) return;
      lastSig = sig;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const area = mainArea();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, area.width, area.height);
      ctx.clip();
      const p = propsRef.current;
      const pr = projector();
      if (p.smc) renderSmcOverlay(ctx, p.smc, p.smcToggles, pr);
      const list = visibleDrawings();
      for (const d of list)
        renderDrawing(ctx, d, pr, { selected: d.id === p.selectedId, hovered: d.id === hoverRef.current });
      if (pendingRef.current) renderDrawing(ctx, pendingRef.current, pr, { selected: true });
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dirtyRef.current += 1;
  }, [props.drawings, props.selectedId, props.smc, props.smcToggles, props.drawingsVisible]);

  useEffect(() => {
    pendingRef.current = null;
    dirtyRef.current += 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.pointerEvents = props.tool === "cursor" ? "none" : "auto";
      canvas.style.cursor = props.tool === "cursor" ? "default" : "crosshair";
    }
  }, [props.tool]);

  // ------------------------------------------------------------- interaction
  const localPoint = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const finishPending = () => {
    const d = pendingRef.current;
    pendingRef.current = null;
    if (!d) return;
    let finished = d;
    if ((d.tool === "long" || d.tool === "short") && d.points.length >= 2) {
      const [a, b] = d.points;
      const risk = Math.abs(a.p - b.p);
      const target = d.tool === "long" ? a.p + risk * 2 : a.p - risk * 2;
      finished = { ...d, points: [a, b, { t: b.t, p: Math.round(target * 100) / 100 }] };
    }
    propsRef.current.onDrawingsChange([...propsRef.current.drawings, finished]);
    propsRef.current.onSelect(finished.id);
    propsRef.current.onToolDone();
    dirtyRef.current += 1;
  };

  const onWrapPointerMove = (e: React.PointerEvent) => {
    const p = propsRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !wrapRef.current) return;
    const { x, y } = localPoint(e);
    if (p.tool !== "cursor") {
      const pending = pendingRef.current;
      if (pending && !SINGLE_POINT_TOOLS.has(pending.tool)) {
        const a = anchorAt(x, y);
        if (a) {
          pending.points = [pending.points[0], a];
          dirtyRef.current += 1;
        }
      }
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      const a = anchorAt(x, y);
      if (!a) return;
      drag.moved = true;
      const dt = a.t - drag.start.t;
      const dp = a.p - drag.start.p;
      draftRef.current = p.drawings.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.handle != null) {
          const points = drag.original.map((pt, i) => (i === drag.handle ? a : pt));
          return { ...d, points };
        }
        return {
          ...d,
          points: drag.original.map((pt) => ({ t: pt.t + dt, p: Math.round((pt.p + dp) * 100) / 100 })),
        };
      });
      dirtyRef.current += 1;
      return;
    }
    const hit = p.drawingsVisible ? hitTest(p.drawings, projector(), x, y) : null;
    const id = hit?.id ?? null;
    if (id !== hoverRef.current) {
      hoverRef.current = id;
      dirtyRef.current += 1;
    }
    canvas.style.pointerEvents = hit ? "auto" : "none";
    canvas.style.cursor = hit ? (hit.handle != null ? "grab" : "move") : "default";
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = propsRef.current;
    const { x, y } = localPoint(e);
    if (e.button !== 0) return;
    e.preventDefault();
    if (p.tool !== "cursor") {
      const a = anchorAt(x, y);
      if (!a) return;
      const pending = pendingRef.current;
      if (!pending) {
        const tool = p.tool as Drawing["tool"];
        const d: Drawing = { id: uid(), tool, points: [a], color: p.color, createdAt: Date.now() };
        if (tool === "text") {
          const text = window.prompt("Text for this note", "");
          if (!text) {
            p.onToolDone();
            return;
          }
          d.text = text.slice(0, 80);
        }
        pendingRef.current = d;
        if (SINGLE_POINT_TOOLS.has(tool)) finishPending();
        else {
          d.points = [a, a];
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }
      } else {
        pending.points = [pending.points[0], a];
        finishPending();
      }
      dirtyRef.current += 1;
      return;
    }
    const hit = hitTest(visibleDrawings(), projector(), x, y);
    if (!hit) return;
    const a = anchorAt(x, y);
    const d = p.drawings.find((item) => item.id === hit.id);
    if (!a || !d) return;
    p.onSelect(hit.id);
    dragRef.current = { id: hit.id, handle: hit.handle, start: a, original: d.points, moved: false };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = propsRef.current;
    const { x, y } = localPoint(e);
    if (p.tool !== "cursor") {
      const pending = pendingRef.current;
      if (pending && pending.points.length >= 2) {
        const pa = pending.points[0];
        const ax = timeToX(pa.t);
        const ay = priceToY(pa.p);
        if (ax != null && ay != null && Math.hypot(ax - x, ay - y) > 8) finishPending();
      }
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved && draftRef.current) p.onDrawingsChange(draftRef.current);
    draftRef.current = null;
    dirtyRef.current += 1;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const p = propsRef.current;
      if (e.key === "Escape") {
        pendingRef.current = null;
        p.onSelect(null);
        if (p.tool !== "cursor") p.onToolDone();
        dirtyRef.current += 1;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && p.selectedId) {
        e.preventDefault();
        p.onDrawingsChange(p.drawings.filter((d) => d.id !== p.selectedId));
        p.onSelect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ------------------------------------------------------------- handle
  useImperativeHandle(ref, () => ({
    snapshot: (header: string) => {
      const chart = chartRef.current;
      const overlay = canvasRef.current;
      if (!chart) return null;
      const shot = chart.takeScreenshot();
      const headerH = Math.round(28 * (shot.width / Math.max(1, wrapRef.current?.clientWidth ?? shot.width)));
      const maxW = 1600;
      const scale = Math.min(1, maxW / shot.width);
      const out = document.createElement("canvas");
      out.width = Math.round(shot.width * scale);
      out.height = Math.round((shot.height + headerH) * scale);
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, shot.width, shot.height + headerH);
      ctx.fillStyle = "#131722";
      ctx.font = `600 ${Math.round(headerH * 0.5)}px 'DM Sans', sans-serif`;
      ctx.fillText(header, Math.round(headerH * 0.4), Math.round(headerH * 0.68));
      ctx.drawImage(shot, 0, headerH);
      if (overlay) ctx.drawImage(overlay, 0, headerH, shot.width, shot.height);
      return out.toDataURL("image/jpeg", 0.86);
    },
    visibleWindow: () => {
      const chart = chartRef.current;
      const { bars } = propsRef.current;
      if (!chart || !bars.length) return null;
      const r = chart.timeScale().getVisibleLogicalRange();
      if (!r) return null;
      const from = Math.max(0, Math.floor(Number(r.from)));
      const to = Math.min(bars.length - 1, Math.ceil(Number(r.to)));
      const slice = bars.slice(from, to + 1);
      if (!slice.length) return null;
      return {
        from: slice[0].time,
        to: slice[slice.length - 1].time,
        lo: Math.min(...slice.map((b) => b.low)),
        hi: Math.max(...slice.map((b) => b.high)),
      };
    },
    fit: () => {
      const n = propsRef.current.bars.length;
      chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 150), to: n + 8 });
      chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
    },
  }));

  return (
    <div ref={wrapRef} className="relative h-full w-full" onPointerMove={onWrapPointerMove}>
      <div ref={hostRef} className="absolute inset-0" />
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 z-[2]"
        style={{ pointerEvents: "none" }}
        onPointerDown={onCanvasPointerDown}
        onPointerUp={onCanvasPointerUp}
        aria-label="Chart drawings layer"
      />
    </div>
  );
});
