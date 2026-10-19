import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketSnapshotsBatch } from "@/lib/gold-analysis.functions";

/** Markets that move gold: the pair itself, the dollar, yields, silver, majors, stocks and oil. */
const MARKETS: Array<{ symbol: string; label: string; hint: string }> = [
  { symbol: "XAUUSD", label: "XAU/USD", hint: "Gold" },
  { symbol: "DXY", label: "DXY", hint: "U.S. Dollar Index — usually moves opposite to gold" },
  { symbol: "US10Y", label: "US10Y", hint: "U.S. 10-year yield — rising yields usually weigh on gold" },
  { symbol: "XAGUSD", label: "XAG/USD", hint: "Silver — usually moves with gold" },
  { symbol: "EURUSD", label: "EUR/USD", hint: "Euro — a weaker dollar usually helps gold" },
  { symbol: "USDJPY", label: "USD/JPY", hint: "Yen — safe-haven flows" },
  { symbol: "SPX", label: "S&P 500", hint: "U.S. stocks — risk appetite" },
  { symbol: "WTI", label: "WTI Oil", hint: "Oil — inflation pressure" },
];
const SYMBOLS = MARKETS.map((m) => m.symbol);

type Quote = { price: number; changePct: number | null; decimals: number };

/** Live prices of the markets that affect gold, shown in the Terminal top bar instead of search. */
export default function TerminalMarketStrip() {
  const fetchBatch = useServerFn(getMarketSnapshotsBatch);
  const quotes = useQuery({
    queryKey: ["terminal-market-strip", SYMBOLS.join(",")],
    queryFn: async () => {
      const res = await fetchBatch({ data: { symbols: SYMBOLS } });
      const map: Record<string, Quote> = {};
      for (const row of res?.results ?? []) {
        if (row.snapshot && Number.isFinite(row.snapshot.price)) map[row.symbol] = row.snapshot;
      }
      return map;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  return (
    <div
      aria-label="Top pairs and stocks that affect gold"
      className="terminal-strip relative flex h-9 min-w-0 items-center overflow-hidden rounded-full border border-gc-line/70 bg-background px-1.5"
    >
      <div className="terminal-strip-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-1 pr-1">
            {MARKETS.map((m) => {
              const q = quotes.data?.[m.symbol];
              const ch = q?.changePct ?? null;
              const tone = ch == null ? "text-gc-ink-muted" : ch >= 0 ? "text-gc-green" : "text-gc-red";
              return (
                <div
                  key={m.symbol}
                  title={m.hint}
                  className="flex shrink-0 items-baseline gap-1.5 rounded-full px-2.5 py-1 text-[12px] hover:bg-gc-console-search"
                >
                  <span className="font-medium text-gc-ink">{m.label}</span>
                  <span className="tabular-nums text-gc-ink">
                    {q ? q.price.toLocaleString("en-US", { minimumFractionDigits: q.decimals, maximumFractionDigits: q.decimals }) : "—"}
                  </span>
                  <span className={`tabular-nums text-[11px] ${tone}`}>
                    {ch == null ? "" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
