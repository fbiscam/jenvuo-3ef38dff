import { cn } from "@/lib/utils";
import type { MailBadgeTier } from "@/lib/mail.functions";

/**
 * Instagram-style verified check.
 * - gold  → staff / official company account
 * - blue  → approved / document-verified member
 */
export function VerifiedBadge({
  tier,
  size = 14,
  className,
}: {
  tier: MailBadgeTier | undefined;
  size?: number;
  className?: string;
}) {
  if (!tier) return null;
  const fill = tier === "gold" ? "#F5B301" : "#1D9BF0";
  const title = tier === "gold" ? "Official JENVU account" : "Verified member";
  return (
    <span
      className={cn("inline-flex align-middle shrink-0", className)}
      title={title}
      aria-label={title}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          fill={fill}
          d="M12 1.5l2.39 2.02 3.13-.22.62 3.08 2.72 1.6-1.23 2.9 1.23 2.9-2.72 1.6-.62 3.08-3.13-.22L12 20.29l-2.39-2.05-3.13.22-.62-3.08-2.72-1.6 1.23-2.9-1.23-2.9 2.72-1.6.62-3.08 3.13.22L12 1.5z"
        />
        <path
          fill="#fff"
          d="M10.6 15.3l-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4-5.8 5.8z"
        />
      </svg>
    </span>
  );
}
