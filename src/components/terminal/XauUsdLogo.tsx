import { cn } from "@/lib/utils";

/**
 * XAU/USD logo matching TradingView's Gold icon: an amber circle with three
 * white bullion bars (one on top, two below). Brand colours are intrinsic
 * to the logo artwork.
 */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 447 447"
      role="img"
      aria-label="XAU/USD"
      className={cn("shrink-0", className)}
    >
      <circle cx="223.5" cy="223.5" r="223.5" fill="#FFB000" />
      <g fill="#FFFFFF">
        <path d="M186 118 H263 L300 194 H147 Z" />
        <path d="M95 222 H170 L209 299 H56 Z" />
        <path d="M276 222 H352 L390 299 H238 Z" />
      </g>
    </svg>
  );
}
