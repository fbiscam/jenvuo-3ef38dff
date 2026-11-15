import type React from "react";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import { JxFace } from "@/components/jxbot/JxBotFeatures";
import haseebWordmark from "@/assets/haseeb-grey.png.asset.json";

/** Supplied HASEEB wordmark in the owner's grey, sized to the label text. */
function HaseebMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-[13px] w-[85px] max-w-full shrink-0 items-center ${className}`}>
      <img src={haseebWordmark.url} alt="HASEEB" className="h-full w-full object-contain" />
    </span>
  );
}

function JxBotLogo() {
  return <JxFace className="relative -top-1 h-7 w-7 shrink-0 bg-gc-ink" eyes="bg-background" />;
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
          Founding seats by <HaseebMark />
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
            <div className={`font-stat-heading tracking-normal text-[40px] font-semibold leading-none text-gc-ink tabular-nums sm:text-[48px] sm:leading-[48px]`}>{it.value}</div>
            <div className="mt-6 font-sans text-[13px] text-gc-ink-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
