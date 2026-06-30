import { useEffect, useRef } from "react";

const TF_MAP: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

type Props = {
  /** App symbol like XAUUSD, BTCUSDT, EURUSD, NAS100. Will be mapped to a TradingView symbol. */
  symbol?: string;
  /** Chart timeframe key (e.g. "15m"). */
  timeframe?: string;
  /** Light or dark theme. Default light to match the signal desk. */
  theme?: "light" | "dark";
  /** Studies to load on the chart. */
  studies?: string[];
};

/** Map an internal symbol → TradingView symbol the embed widget understands. */
function toTvSymbol(raw?: string): string {
  if (!raw) return "OANDA:XAUUSD";
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Metals / FX on OANDA (matches what most traders see).
  if (s === "XAUUSD" || s === "GOLD") return "OANDA:XAUUSD";
  if (s === "XAGUSD" || s === "SILVER") return "OANDA:XAGUSD";

  // Indices
  const indexMap: Record<string, string> = {
    NAS100: "OANDA:NAS100USD", US100: "OANDA:NAS100USD", NDX: "OANDA:NAS100USD",
    SPX500: "OANDA:SPX500USD", US500: "OANDA:SPX500USD", SPX: "OANDA:SPX500USD",
    US30: "OANDA:US30USD", DJI: "OANDA:US30USD",
    DAX: "OANDA:DE30EUR",
    FTSE: "OANDA:UK100GBP",
    N225: "OANDA:JP225USD",
    DXY: "TVC:DXY",
  };
  if (indexMap[s]) return indexMap[s];

  // Crypto — Binance spot
  if (/^(BTC|ETH|SOL|XRP|DOGE|BNB|ADA|AVAX|MATIC|LTC|LINK|DOT|TRX|TON|SHIB|PEPE|ATOM|NEAR|ARB|OP|APT|SUI|FIL|UNI|AAVE)/.test(s)) {
    const base = s.replace(/USDT?$|USDC$|BUSD$/, "");
    return `BINANCE:${base}USDT`;
  }

  // FX pairs (6 letters, both halves are G10/major)
  if (/^[A-Z]{6}$/.test(s)) {
    const fx = new Set(["EUR","GBP","JPY","AUD","NZD","CAD","CHF","USD"]);
    if (fx.has(s.slice(0,3)) && fx.has(s.slice(3))) return `OANDA:${s}`;
  }

  // Default: pass through and hope TradingView resolves it.
  return s;
}

export function TradingViewChart({
  symbol,
  timeframe = "15m",
  theme = "light",
  studies = ["STD;Smart%1Money%1Concepts", "STD;EMA", "STD;RSI", "STD;Volume"],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    containerRef.current.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTvSymbol(symbol),
      interval: TF_MAP[timeframe] ?? "15",
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      backgroundColor: theme === "dark" ? "rgba(8, 10, 20, 1)" : "rgba(255,255,255,1)",
      gridColor: theme === "dark" ? "rgba(212, 175, 55, 0.06)" : "rgba(15,23,42,0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      withdateranges: true,
      studies,
      support_host: "https://www.tradingview.com",
    });
    containerRef.current.appendChild(script);
  }, [symbol, timeframe, theme, studies.join("|")]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={containerRef} />
  );
}
