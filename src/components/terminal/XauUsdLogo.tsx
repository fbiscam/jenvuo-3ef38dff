import { cn } from "@/lib/utils";

/** Gold (XAU/USD) coin mark used in the Terminal. */
export function XauUsdLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="XAU/USD"
      style={{ width: size, height: size, fontSize: size * 0.36, background: "radial-gradient(circle at 30% 28%, #fde68a, #f59e0b 55%, #b45309)" }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold text-amber-950", className)}
    >
      Au
    </span>
  );
}
