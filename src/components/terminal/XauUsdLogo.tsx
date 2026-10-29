import { cn } from "@/lib/utils";

/** XAU/USD badge (main Terminal instrument): round gold coin with "Au". */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
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
        <linearGradient id="xau-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7D774" />
          <stop offset="55%" stopColor="#D4A017" />
          <stop offset="100%" stopColor="#9C6F0A" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#xau-coin)" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#FFF3C4" strokeOpacity="0.6" strokeWidth="1.2" />
      <text x="20" y="25.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#5A3E00" fontFamily="system-ui, sans-serif">
        Au
      </text>
    </svg>
  );
}
