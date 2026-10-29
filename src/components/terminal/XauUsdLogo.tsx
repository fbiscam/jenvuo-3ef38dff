import { cn } from "@/lib/utils";
import euFlag from "@/assets/watchlist/flag-eu.svg";

/** EUR/USD badge (main Terminal instrument): round EU flag. */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <img
      src={euFlag}
      width={size}
      height={size}
      alt="EUR/USD"
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
