import { cn } from "@/lib/utils";

/** XAU/USD badge: orange disc with three stacked white gold bars. */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 447 447"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="XAU/USD"
    >
      <circle cx="223.5" cy="223.5" r="223.5" fill="#FFAD00" />
      <g fill="#FFFFFF">
        <polygon points="185,118 265,118 300,195 147,195" />
        <polygon points="93,222 172,222 209,300 56,300" />
        <polygon points="275,222 353,222 390,300 238,300" />
      </g>
    </svg>
  );
}
