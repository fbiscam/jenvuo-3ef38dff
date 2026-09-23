import { useId } from "react";
import { cn } from "@/lib/utils";

/** XAU/USD pair badge: gold coin overlapped by a US flag disc (TradingView-style). */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gold = `xau-gold-${uid}`;
  const shine = `xau-shine-${uid}`;
  const flagClip = `usd-clip-${uid}`;
  const w = size * 1.45;
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 36 24"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="XAU/USD"
    >
      <defs>
        <radialGradient id={gold} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="45%" stopColor="#F5C542" />
          <stop offset="100%" stopColor="#B7811A" />
        </radialGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={flagClip}>
          <circle cx="24" cy="12" r="10" />
        </clipPath>
      </defs>

      {/* Gold coin */}
      <circle cx="12" cy="12" r="11" fill={`url(#${gold})`} stroke="#9A6B10" strokeWidth="1" />
      <circle cx="12" cy="12" r="8.3" fill="none" stroke="#9A6B10" strokeOpacity="0.45" strokeWidth="0.8" />
      <ellipse cx="11" cy="7.5" rx="6.5" ry="3.2" fill={`url(#${shine})`} />
      <text
        x="12"
        y="15.3"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="9"
        fontWeight="700"
        fill="#6B4A0B"
      >
        Au
      </text>

      {/* US flag disc */}
      <circle cx="24" cy="12" r="11" fill="#FFFFFF" />
      <g clipPath={`url(#${flagClip})`}>
        <rect x="14" y="2" width="20" height="20" fill="#FFFFFF" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} x="14" y={2 + i * (20 / 13) * 1} width="20" height={20 / 13} fill="#B22234" />
        ))}
        {[1, 3, 5, 7, 9, 11].map((i) => (
          <rect key={`w${i}`} x="14" y={2 + i * (20 / 13)} width="20" height={20 / 13} fill="#FFFFFF" />
        ))}
        <rect x="14" y="2" width="10" height={(20 / 13) * 7} fill="#3C3B6E" />
        {[
          [16, 4], [19, 4], [22, 4],
          [17.5, 6.3], [20.5, 6.3],
          [16, 8.6], [19, 8.6], [22, 8.6],
          [17.5, 10.9], [20.5, 10.9],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.6" fill="#FFFFFF" />
        ))}
      </g>
      <circle cx="24" cy="12" r="10.5" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="24" cy="12" r="11" fill="none" stroke="#0F172A" strokeOpacity="0.15" strokeWidth="0.6" />
    </svg>
  );
}
