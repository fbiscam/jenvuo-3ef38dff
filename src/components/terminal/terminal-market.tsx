import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketSnapshotsBatch, getTerminalChart } from "@/lib/gold-analysis.functions";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { technicalSummary } from "@/lib/chart/technicals";
import xagIcon from "@/assets/watchlist/xag.svg";
import dxyIcon from "@/assets/watchlist/dxy.svg";
import usIcon from "@/assets/watchlist/flag-us.svg";
import euIcon from "@/assets/watchlist/flag-eu.svg";
import spxIcon from "@/assets/watchlist/spx.svg";

export type WatchItem = { symbol: string; label: string; name: string; icon?: string };

/** Markets that move EUR/USD, shown in Market Watch and the top cards. */
export const WATCH: WatchItem[] = [
  { symbol: "EURUSD", label: "EUR/USD", name: "Euro / Dollar", icon: euIcon },
  { symbol: "XAGUSD", label: "XAG/USD", name: "Silver", icon: xagIcon },
  { symbol: "DXY", label: "DXY", name: "Dollar Index", icon: dxyIcon },
  { symbol: "US10Y", label: "US10Y", name: "US 10Y Yield", icon: usIcon },
  { symbol: "SPX", label: "S&P 500", name: "US Stocks", icon: spxIcon },
  { symbol: "USDJPY", label: "USD/JPY", name: "Dollar / Yen" },
];

export const TECH_TFS = [
  { key: "15m", label: "15m" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
];

export type Quote = { price: number; changePct: number | null; decimals: number };

export const num = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const tone = (v: number) => (v > 0 ? "text-gc-green" : v < 0 ? "text-gc-red" : "text-gc-ink");

/** Live quotes for the watch list (shared cache between the top cards and Market Watch). */
export function useWatchQuotes() {
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
  return useQuery({
    queryKey: ["terminal-side-watch", WATCH.map((w) => w.symbol).join(",")],
    queryFn: async () => {
      const res = await fetchBatch({ data: { symbols: WATCH.map((w) => w.symbol) } });
      const map: Record<string, Quote> = {};
      for (const row of res?.results ?? []) if (row.snapshot && Number.isFinite(row.snapshot.price)) map[row.symbol] = row.snapshot;
      return map;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });
}

/** Indicator readings on closed candles; follows the chart timeframe until a chip is picked. */
export function useTechnicals(bars: OhlcvBar[], timeframeKey: string, allowed: Array<{ key: string }> = TECH_TFS) {
  const fetchChart = useServerFn(getTerminalChart);
  const [techTf, setTechTf] = useState<string | null>(null);
  const activeTf = techTf ?? (allowed.some((t) => t.key === timeframeKey) ? timeframeKey : "15m");
  const usesChartBars = activeTf === timeframeKey;
  const otherTf = useQuery({
    queryKey: ["terminal-technicals", activeTf],
    queryFn: () => fetchChart({ data: { timeframe: activeTf, asset: "EURUSD" } }),
    enabled: !usesChartBars,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const sourceBars: OhlcvBar[] = usesChartBars ? bars : ((otherTf.data?.bars as OhlcvBar[] | undefined) ?? []);
  const closedKey =
    sourceBars.length > 1
      ? `${activeTf}:${sourceBars.length}:${sourceBars[sourceBars.length - 2].time}:${sourceBars[sourceBars.length - 2].close}`
      : activeTf;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tech = useMemo(() => technicalSummary(sourceBars.slice(0, -1)), [closedKey]);
  return { tech, activeTf, setTechTf, isError: otherTf.isError };
}
