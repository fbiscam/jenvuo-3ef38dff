import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { X } from "lucide-react";
import { PineError, runPineScript, type PineCandle } from "@/lib/pine/engine";
import { computeMarketStructure } from "@/lib/pine/market-structure";
import { Button } from "@/components/ui/button";

export type PineIndicator = {
  id: string;
  name: string;
  code: string;
  builtin?: "market-structure";
  locked?: boolean;
};

type Props = {
  indicator: PineIndicator;
  candles: PineCandle[];
  onRemove: (id: string) => void;
};

export function PineIndicatorPane({ indicator, candles, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const structure = useMemo(
    () => (indicator.builtin === "market-structure" ? computeMarketStructure(candles) : null),
    [indicator.builtin, candles],
  );

  const compiled = useMemo(() => {
    if (indicator.builtin === "market-structure") {
      return { ok: true as const, value: { name: indicator.name, overlay: true, plots: [], hlines: [] } };
    }
    try {
      return { ok: true as const, value: runPineScript(indicator.code, candles) };
    } catch (error) {
      const message =
        error instanceof PineError
          ? `Line ${error.line}: ${error.message}`
          : error instanceof Error
            ? error.message
            : "This script could not be compiled.";
      return { ok: false as const, message };
    }
  }, [indicator.code, candles]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host || !compiled.ok) return;
    const result = compiled.value;

    const chart = createChart(host, {
      width: host.clientWidth || 600,
      height: host.clientHeight || 170,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#4b5563",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.15)" },
        horzLines: { color: "rgba(148,163,184,0.15)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.35)" },
      timeScale: { borderColor: "rgba(148,163,184,0.35)", timeVisible: true },
    });
    chartRef.current = chart;

    if (result.overlay) {
      const price: ReturnType<typeof chart.addSeries> = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
      price.setData(
        candles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );

      if (structure) {
        const markers: SeriesMarker<Time>[] = [];
        for (const swing of structure.swings.slice(-40)) {
          const bullish = swing.label === "HH" || swing.label === "HL";
          markers.push({
            time: swing.time as Time,
            position: swing.label === "HH" || swing.label === "LH" ? "aboveBar" : "belowBar",
            color: bullish ? "#00a67d" : "#e91e63",
            shape: swing.label === "HH" || swing.label === "LH" ? "arrowDown" : "arrowUp",
            text: swing.label,
          });
        }
        for (const event of structure.events.slice(-12)) {
          markers.push({
            time: event.time as Time,
            position: event.direction === "bullish" ? "belowBar" : "aboveBar",
            color: event.kind === "CHoCH" ? "#f59e0b" : event.direction === "bullish" ? "#00a67d" : "#e91e63",
            shape: "circle",
            text: event.kind,
          });
          const level = chart.addSeries(LineSeries, {
            color: event.kind === "CHoCH" ? "#f59e0b" : "#64748b",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          level.setData([
            { time: event.fromTime as Time, value: event.price },
            { time: event.time as Time, value: event.price },
          ]);
        }
        createSeriesMarkers(price, markers.sort((a, b) => Number(a.time) - Number(b.time)));
      }
    }

    for (const plot of result.plots) {
      const line = chart.addSeries(LineSeries, {
        color: plot.color,
        lineWidth: Math.min(4, plot.linewidth) as 1 | 2 | 3 | 4,
        title: plot.title,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      line.setData(
        plot.values
          .map((value, index) => ({ time: candles[index]!.time as Time, value }))
          .filter((point): point is { time: Time; value: number } => point.value !== null),
      );
      for (const hline of result.hlines) {
        line.createPriceLine({
          price: hline.value,
          color: hline.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: hline.title,
        });
      }
    }

    chart.timeScale().fitContent();
    const observer = new ResizeObserver(() => {
      chart.resize(host.clientWidth, host.clientHeight);
      chart.timeScale().fitContent();
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [compiled, candles]);

  return (
    <div className="flex min-h-0 flex-col border-t border-border bg-background">
      <div className="flex h-8 shrink-0 items-center gap-2 px-3">
        <span className="truncate text-xs font-medium">{indicator.name}</span>
        {!compiled.ok && <span className="text-xs text-destructive">Script error</span>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6"
          onClick={() => onRemove(indicator.id)}
          title="Remove indicator"
          aria-label={`Remove ${indicator.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {compiled.ok ? (
        <div ref={containerRef} className="h-[170px] w-full" />
      ) : (
        <p className="px-3 pb-3 font-mono text-xs text-destructive">{compiled.message}</p>
      )}
    </div>
  );
}
