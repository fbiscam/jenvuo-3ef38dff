import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { X } from "lucide-react";
import { PineError, runPineScript, type PineCandle } from "@/lib/pine/engine";
import { Button } from "@/components/ui/button";

export type PineIndicator = { id: string; name: string; code: string };

type Props = {
  indicator: PineIndicator;
  candles: PineCandle[];
  onRemove: (id: string) => void;
};

export function PineIndicatorPane({ indicator, candles, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const compiled = useMemo(() => {
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
      autoSize: true,
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
      const price = chart.addSeries(CandlestickSeries, {
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
    return () => {
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
