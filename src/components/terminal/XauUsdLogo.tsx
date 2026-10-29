import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * XAU/USD pair badge in the TradingView style: a gold coin with stacked
 * bullion bars in front, overlapping a green USD "$" coin behind it.
 * Brand colours are intrinsic to the logo artwork.
 */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const gold = `xau-gold-${id}`;
  const bar = `xau-bar-${id}`;
  const usd = `xau-usd-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="XAU/USD"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCE7A2" />
          <stop offset="55%" stopColor="#E8B931" />
          <stop offset="100%" stopColor="#B7860B" />
        </linearGradient>
        <linearGradient id={bar} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF6D2" />
          <stop offset="100%" stopColor="#D9A21B" />
        </linearGradient>
        <linearGradient id={usd} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4CC38A" />
          <stop offset="100%" stopColor="#1E8E5A" />
        </linearGradient>
      </defs>

      {/* USD coin (behind, bottom-right) */}
      <circle cx="27" cy="27" r="12.5" fill={`url(#${usd})`} />
      <text
        x="29.5"
        y="33"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#FFFFFF"
        fontFamily="system-ui, sans-serif"
      >
        $
      </text>

      {/* Gold coin (front, top-left) with a ring that separates it from USD */}
      <circle cx="16" cy="16" r="15" fill={`url(#${gold})`} stroke="#FFFFFF" strokeWidth="1.6" />

      {/* Stacked bullion bars: two on the bottom, one on top */}
      <g stroke="#8A6200" strokeWidth="0.7" strokeLinejoin="round">
        <path d="M6.5 22.5 L8.3 18.6 H14.7 L16.5 22.5 Z" fill={`url(#${bar})`} />
        <path d="M15.5 22.5 L17.3 18.6 H23.7 L25.5 22.5 Z" fill={`url(#${bar})`} />
        <path d="M11 18.2 L12.8 14.3 H19.2 L21 18.2 Z" fill={`url(#${bar})`} />
      </g>
      <path d="M9.6 19.6 H13.4 M18.6 19.6 H22.4 M14.1 15.3 H17.9" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}
