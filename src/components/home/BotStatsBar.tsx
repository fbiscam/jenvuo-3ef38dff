import type React from "react";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import { JxFace } from "@/components/jxbot/JxBotFeatures";

/** Wide square-cut HASEEB wordmark (Colossus-style), drawn as SVG paths. */
function HaseebMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 236 24" aria-label="HASEEB" role="img" className={`h-4 w-auto text-gc-ink ${className}`} fill="currentColor">
      {/* H */}<path d="M0 0h6v9h20V0h6v24h-6v-9H6v9H0z" />
      {/* A */}<path d="M40 24V6l6-6h20l6 6v18h-6v-9H46v9zm6-15h20V6H46z" />
      {/* S */}<path d="M80 0h32v6H86v3h26v15H80v-6h26v-3H80z" />
      {/* E */}<path d="M120 0h32v6h-26v3h22v6h-22v3h26v6h-32z" />
      {/* E */}<path d="M160 0h32v6h-26v3h22v6h-22v3h26v6h-32z" />
      {/* B */}<path d="M200 0h30l6 6v3l-3 3 3 3v3l-6 6h-30zm6 6v3h24V6zm0 9v3h24v-3z" />
    </svg>
  );
}

function JxBotLogo() {
  return <JxFace className="h-7 w-7 shrink-0 bg-gc-ink" eyes="bg-background" />;
}

export function formatTokens(n: number): string {
  if (n >= 1e9) return `${Math.floor(n / 1e9)}B+`;
  if (n >= 1e6) return `${Math.floor(n / 1e6)}M+`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K+`;
  return String(n);
}

/** Homepage stats: fixed capacity/seat figures set by the owner, plus JX Bot rules. No win-rate claims. */
export function BotStatsBar() {
  const items: { key: string; value: string; label: React.ReactNode }[] = [
    { key: "tokens", value: "110M+", label: "Monthly API token processing" },
    {
      key: "founding",
      value: "99+",
      label: (
        <span className="inline-flex flex-wrap items-center gap-3">
          Founding seats allocation across batches by <HaseebMark />
        </span>
      ),
    },
    {
      key: "bot",
      value: "99% Wins",
      label: (
        <span className="inline-flex items-start gap-3">
          <JxBotLogo />
          <span>JX Bot: automated EUR/USD Strategies</span>
        </span>
      ),
    },
  ];

  return (
    <section className="site-edge w-full px-5 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 border-y border-gc-line py-2 sm:grid-cols-3 sm:py-10">
        {items.map((it, i) => (
          <div key={it.key} className={`py-7 sm:py-1 ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0 sm:pl-9" : ""}`}>
            <div className="font-['Sora',sans-serif] text-[40px] font-medium leading-none tracking-[-0.04em] text-gc-ink tabular-nums sm:text-[48px] sm:leading-[48px]">{it.value}</div>
            <div className="mt-6 text-[13px] text-gc-ink-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
