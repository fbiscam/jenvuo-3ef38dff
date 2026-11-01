import goldLogo from "@/assets/terminal/gold_logo.png.asset.json";
import { cn } from "@/lib/utils";

/** Gold (XAU/USD) mark used in the Terminal: the owner's gold-bars logo. */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <img
      src={goldLogo.url}
      alt="XAU/USD"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
