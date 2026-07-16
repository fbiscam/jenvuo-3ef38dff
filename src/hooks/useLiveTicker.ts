import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMarketSnapshot } from "@/lib/gold-analysis.functions";

export type TickerRow = [string, string, string];

export const DEFAULT_TICKER_ROWS: TickerRow[] = [
  ["XAU/USD", "—", "…"],
  ["XAU/EUR", "—", "…"],
  ["XAU/GBP", "—", "…"],
  ["XAU/JPY", "—", "…"],
  ["XAU/AUD", "—", "…"],
  ["XAU/CHF", "—", "…"],
  ["DXY", "—", "…"],
];

const SYMBOL_MAP: Record<string, string> = {
  "XAU/USD": "XAUUSD",
  "XAU/EUR": "XAUEUR",
  "XAU/GBP": "XAUGBP",
  "XAU/JPY": "XAUJPY",
  "XAU/AUD": "XAUAUD",
  "XAU/CHF": "XAUCHF",
  DXY: "DXY",
};

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

export function useLiveTicker(initial: TickerRow[] = DEFAULT_TICKER_ROWS): TickerRow[] {
  const [rows, setRows] = React.useState<TickerRow[]>(initial);
  const fetchSnapshot = useServerFn(getMarketSnapshot);
  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const entries = await Promise.all(
          initial.map(async ([label]) => {
            const sym = SYMBOL_MAP[label];
            if (!sym) return null;
            try {
              const snap = await fetchSnapshot({ data: { symbol: sym } });
              if (!snap || !Number.isFinite(snap.price)) return null;
              return [label, snap.price, snap.changePct] as const;
            } catch {
              return null;
            }
          }),
        );
        if (!alive) return;
        const byLabel = new Map(
          entries
            .filter((e): e is readonly [string, number, number | null] => !!e)
            .map((e) => [e[0], { price: e[1], pct: e[2] }]),
        );
        setRows((prev) =>
          prev.map(([label, price, delta]) => {
            const d = byLabel.get(label);
            if (!d) return [label, price, delta];
            const sign = (d.pct ?? 0) >= 0 ? "+" : "";
            const deltaOut = d.pct == null ? delta : `${sign}${d.pct.toFixed(2)}%`;
            return [label, fmtPrice(d.price), deltaOut];
          }),
        );
      } catch {
        /* ignore */
      }
    };
    run();
    const id = setInterval(run, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows;
}
