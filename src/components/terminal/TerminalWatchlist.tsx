import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Newspaper, PanelRightClose } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMarketSnapshotsBatch } from "@/lib/gold-analysis.functions";
import type { NewsEvent } from "@/lib/news.functions";
import { isMarketClosed } from "@/lib/signals/qualification";
import { cn } from "@/lib/utils";
import { XauUsdLogo } from "./XauUsdLogo";
import btcLogo from "@/assets/watchlist/btc.svg";
import ethLogo from "@/assets/watchlist/eth.svg";
import xagLogo from "@/assets/watchlist/xag.svg";
import spxLogo from "@/assets/watchlist/spx.svg";
import dxyLogo from "@/assets/watchlist/dxy.svg";
import flagEu from "@/assets/watchlist/flag-eu.svg";
import flagGb from "@/assets/watchlist/flag-gb.svg";
import flagUs from "@/assets/watchlist/flag-us.svg";
import flagJp from "@/assets/watchlist/flag-jp.svg";

type ChartAsset = "XAUUSD" | "BTCUSD";

type WatchItem = {
  symbol: string;
  name: string;
  /** Single round logo, or [base, quote] flags drawn as an overlapping pair. */
  logo: string | [string, string];
  chartable?: ChartAsset;
};

const GROUPS: Array<{ label: string; items: WatchItem[] }> = [
  {
    label: "Metals",
    items: [
      { symbol: "XAUUSD", name: "Gold Spot / U.S. Dollar", logo: "xau", chartable: "XAUUSD" },
      { symbol: "XAGUSD", name: "Silver / U.S. Dollar", logo: xagLogo },
    ],
  },
  {
    label: "Crypto",
    items: [
      { symbol: "BTCUSD", name: "Bitcoin / U.S. Dollar", logo: btcLogo, chartable: "BTCUSD" },
      { symbol: "ETHUSD", name: "Ethereum / U.S. Dollar", logo: ethLogo },
    ],
  },
  {
    label: "Forex",
    items: [
      { symbol: "EURUSD", name: "Euro / U.S. Dollar", logo: [flagEu, flagUs] },
      { symbol: "GBPUSD", name: "British Pound / U.S. Dollar", logo: [flagGb, flagUs] },
      { symbol: "USDJPY", name: "U.S. Dollar / Japanese Yen", logo: [flagUs, flagJp] },
    ],
  },
  {
    label: "Indices",
    items: [
      { symbol: "DXY", name: "U.S. Dollar Index", logo: dxyLogo },
      { symbol: "SPX", name: "S&P 500 Index", logo: spxLogo },
    ],
  },
];

const ALL_SYMBOLS = GROUPS.flatMap((group) => group.items.map((item) => item.symbol));
const UP = "text-[#089981]";
const DOWN = "text-[#f23645]";

type Snapshot = {
  price: number;
  prevClose: number | null;
  changePct: number | null;
  decimals: number;
  t: number;
};

function fmt(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function SymbolBadge({ item, size = 18 }: { item: WatchItem; size?: number }) {
  if (item.logo === "xau") return <XauUsdLogo size={size} />;
  if (Array.isArray(item.logo)) {
    const flag = Math.round(size * 0.72);
    return (
      <span className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
        <img
          src={item.logo[0]}
          alt=""
          className="absolute left-0 top-0 rounded-full object-cover ring-1 ring-card"
          style={{ width: flag, height: flag }}
        />
        <img
          src={item.logo[1]}
          alt=""
          className="absolute bottom-0 right-0 rounded-full object-cover ring-1 ring-card"
          style={{ width: flag, height: flag }}
        />
      </span>
    );
  }
  return (
    <img
      src={item.logo}
      alt=""
      aria-hidden="true"
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function formatNewsStamp(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${day}, ${time} NY`;
}

export function TerminalWatchlist({
  asset,
  onAssetChange,
  news,
  newsLoading,
  onClose,
  className,
}: {
  asset: ChartAsset;
  onAssetChange: (asset: ChartAsset) => void;
  news?: NewsEvent;
  newsLoading: boolean;
  onClose: () => void;
  className?: string;
}) {
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string>(asset);

  const quotes = useQuery({
    queryKey: ["terminal-watchlist", ALL_SYMBOLS.join(",")],
    queryFn: async () => {
      const res = await fetchBatch({ data: { symbols: ALL_SYMBOLS } });
      const map: Record<string, Snapshot> = {};
      for (const row of res?.results ?? []) {
        if (row.snapshot && Number.isFinite(row.snapshot.price)) map[row.symbol] = row.snapshot;
      }
      return map;
    },
    staleTime: 8_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });

  // Flash each price green/red when it ticks up/down, like a trading terminal.
  const prevPrices = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  useEffect(() => {
    const data = quotes.data;
    if (!data) return;
    const next: Record<string, "up" | "down"> = {};
    for (const [sym, q] of Object.entries(data)) {
      const before = prevPrices.current[sym];
      if (before != null && q.price !== before) next[sym] = q.price > before ? "up" : "down";
      prevPrices.current[sym] = q.price;
    }
    if (Object.keys(next).length === 0) return;
    setFlash(next);
    const id = window.setTimeout(() => setFlash({}), 900);
    return () => window.clearTimeout(id);
  }, [quotes.data]);

  const allItems = GROUPS.flatMap((group) => group.items);
  const focusSymbol = allItems.some((item) => item.symbol === focus) ? focus : asset;
  const focusItem = allItems.find((item) => item.symbol === focusSymbol) ?? allItems[0];
  const focusQuote = quotes.data?.[focusItem.symbol];
  const focusChange =
    focusQuote && focusQuote.prevClose != null ? focusQuote.price - focusQuote.prevClose : null;
  // Crypto trades 24/7; metals, forex and indices share the weekend close.
  const closed =
    focusItem.symbol !== "BTCUSD" && focusItem.symbol !== "ETHUSD" && isMarketClosed(new Date());

  return (
    <aside
      aria-label="Watchlist"
      className={cn(
        "min-h-0 w-[330px] shrink-0 flex-col border-l border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="text-sm font-semibold text-foreground">Watchlist</h2>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Hide watchlist"
          aria-label="Hide watchlist"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_78px_58px_54px] gap-1 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">Last</span>
        <span className="text-right">Chg</span>
        <span className="text-right">Chg%</span>
      </div>

      <div className="sidebar-hover-scroll watchlist-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="py-1">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))}
                className="flex w-full items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                aria-expanded={!collapsed[group.label]}
              >
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", collapsed[group.label] && "-rotate-90")}
                />
                {group.label}
              </button>
              {!collapsed[group.label] &&
                group.items.map((item) => {
                  const q = quotes.data?.[item.symbol];
                  const chg = q && q.prevClose != null ? q.price - q.prevClose : null;
                  const up = (q?.changePct ?? 0) >= 0;
                  const isChart = item.chartable === asset;
                  const isFocus = item.symbol === focusSymbol;
                  return (
                    <button
                      type="button"
                      key={item.symbol}
                      onClick={() => {
                        setFocus(item.symbol);
                        if (item.chartable) onAssetChange(item.chartable);
                      }}
                      title={item.chartable ? `Open ${item.symbol} chart` : item.name}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_78px_58px_54px] items-center gap-1 border-l-2 border-transparent px-3 py-2 text-left text-[13px] tabular-nums text-foreground transition-colors hover:bg-accent",
                        isFocus && "bg-accent",
                        isChart && "border-l-primary",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <SymbolBadge item={item} />
                        <span className="truncate">{item.symbol}</span>
                      </span>
                      <span
                        className={cn(
                          "rounded-sm px-0.5 text-right transition-colors duration-500",
                          flash[item.symbol] === "up" && "bg-[#089981]/25 text-[#089981]",
                          flash[item.symbol] === "down" && "bg-[#f23645]/25 text-[#f23645]",
                        )}
                      >
                        {q ? fmt(q.price, q.decimals) : "—"}
                      </span>
                      <span className={cn("text-right", q && (up ? UP : DOWN))}>
                        {chg != null ? `${chg >= 0 ? "+" : ""}${fmt(chg, Math.min(q!.decimals, 3))}` : "—"}
                      </span>
                      <span className={cn("text-right", q && (up ? UP : DOWN))}>
                        {q?.changePct != null
                          ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`
                          : "—"}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Symbol details */}
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <SymbolBadge item={focusItem} size={24} />
            <span className="text-sm font-semibold">{focusItem.symbol}</span>
          </div>
          <p className="mt-2 text-xs text-foreground">{focusItem.name}</p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold leading-none tabular-nums">
              {focusQuote ? fmt(focusQuote.price, focusQuote.decimals) : "—"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {focusItem.symbol === "USDJPY" ? "JPY" : focusItem.symbol === "DXY" || focusItem.symbol === "SPX" ? "PTS" : "USD"}
            </span>
          </div>
          {focusQuote && focusChange != null && (
            <p
              className={cn(
                "mt-1.5 text-sm font-semibold tabular-nums",
                focusChange >= 0 ? UP : DOWN,
              )}
            >
              {focusChange >= 0 ? "+" : ""}
              {fmt(focusChange, Math.min(focusQuote.decimals, 3))}{" "}
              {focusQuote.changePct != null &&
                `${focusQuote.changePct >= 0 ? "+" : ""}${focusQuote.changePct.toFixed(2)}%`}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", closed ? "bg-muted-foreground" : "bg-[#089981]")}
            />
            {closed ? "Market closed" : "Market open"}
          </p>
          {focusQuote && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Last update{" "}
              {new Date(focusQuote.t).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Newspaper className={cn("h-3.5 w-3.5", news ? "text-[#f23645]" : "text-amber-500")} />
              <span className="font-semibold text-foreground">Upcoming news</span>
              {news && <span>· {formatNewsStamp(news.date)}</span>}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-foreground">
              {newsLoading
                ? "Checking news…"
                : news
                  ? `${news.country} · ${news.title}`
                  : "No important news ahead"}
            </p>
            {news && (news.forecast || news.previous) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {news.forecast ? `Forecast ${news.forecast}` : ""}
                {news.forecast && news.previous ? " · " : ""}
                {news.previous ? `Previous ${news.previous}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
