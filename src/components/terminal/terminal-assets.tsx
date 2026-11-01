import btcLogo from "@/assets/watchlist/btc.svg";
import flagEu from "@/assets/watchlist/flag-eu.svg";
import flagUs from "@/assets/watchlist/flag-us.svg";
import { cn } from "@/lib/utils";
import { XauUsdLogo } from "./XauUsdLogo";

/** Markets the Terminal can chart. */
export type ChartAsset = "XAUUSD" | "BTCUSD" | "EURUSD";

export const CHART_ASSETS: Array<{ symbol: ChartAsset; label: string; title: string; decimals: number }> = [
  { symbol: "XAUUSD", label: "XAU/USD", title: "Gold / U.S. Dollar", decimals: 2 },
  { symbol: "BTCUSD", label: "BTC/USD", title: "Bitcoin / U.S. Dollar", decimals: 2 },
  { symbol: "EURUSD", label: "EUR/USD", title: "Euro / U.S. Dollar", decimals: 5 },
];

export const assetInfo = (asset: ChartAsset) => CHART_ASSETS.find((a) => a.symbol === asset) ?? CHART_ASSETS[0]!;

export const parseChartAsset = (value: unknown): ChartAsset =>
  value === "BTCUSD" || value === "EURUSD" ? value : "XAUUSD";

/** Crypto trades 24/7; Gold and EUR/USD close for the weekend. */
export const hasWeekendClose = (asset: ChartAsset) => asset !== "BTCUSD";

/** Round market logo: gold coin, Bitcoin mark, or overlapping EU/US flags. */
export function AssetLogo({ asset, size = 22, className }: { asset: ChartAsset; size?: number; className?: string }) {
  if (asset === "XAUUSD") return <XauUsdLogo size={size} className={className} />;
  if (asset === "BTCUSD")
    return (
      <img
        src={btcLogo}
        alt="BTC/USD"
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  const flag = Math.round(size * 0.72);
  return (
    <span role="img" aria-label="EUR/USD" className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <img src={flagEu} alt="" className="absolute left-0 top-0 rounded-full object-cover ring-2 ring-card" style={{ width: flag, height: flag }} />
      <img src={flagUs} alt="" className="absolute bottom-0 right-0 rounded-full object-cover ring-2 ring-card" style={{ width: flag, height: flag }} />
    </span>
  );
}
