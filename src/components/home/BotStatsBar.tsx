import type React from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";

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
  return (
    <svg viewBox="0 0 32 32" aria-label="JX Bot" role="img" className="h-7 w-7 shrink-0 text-gc-ink" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="9" width="22" height="16" rx="4" />
      <path d="M16 4v5M11 15v3M21 15v3M12 21h8" strokeLinecap="round" />
    </svg>
  );
}

export function formatTokens(n: number): string {
  if (n >= 1e9) return `${Math.floor(n / 1e9)}B+`;
  if (n >= 1e6) return `${Math.floor(n / 1e6)}M+`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K+`;
  return String(n);
}

/** Homepage stats: live API tokens (30d), live Founding applications, JX Bot rules. No win-rate claims. */
export function BotStatsBar() {
  const [stats, setStats] = useState<{ api_tokens_30d: number; founding_applications: number } | null>(null);
  useEffect(() => {
    supabase.rpc("public_home_stats" as never).then(({ data }) => {
      if (data) setStats(data as never);
    });
  }, []);

  const items: { key: string; value: string; label: React.ReactNode }[] = [
    { key: "tokens", value: stats ? formatTokens(Number(stats.api_tokens_30d)) : "—", label: "API tokens processed across all accounts in the last 30 days" },
    {
      key: "founding",
      value: stats ? String(stats.founding_applications) : "—",
      label: (
        <span className="inline-flex flex-wrap items-center gap-3">
          Founding applications by <HaseebMark />
        </span>
      ),
    },
    {
      key: "bot",
      value: "100%",
      label: (
        <span className="inline-flex items-start gap-3">
          <JxBotLogo />
          <span>JX Bot: automated EUR/USD M15 basket execution on MT5, stops for the day at a {DAILY_DRAWDOWN_PCT}% trailing drawdown</span>
        </span>
      ),
    },
  ];

  return (
    <section className="site-edge w-full px-5 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 border-y border-gc-line py-2 sm:grid-cols-3 sm:py-10">
        {items.map((it, i) => (
          <div key={it.key} className={`py-7 sm:py-1 ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0 sm:pl-9" : ""}`}>
            <div className="text-[44px] font-normal leading-none tracking-[-0.02em] text-gc-ink tabular-nums sm:text-[52px]">{it.value}</div>
            <div className="mt-6 text-[13px] text-gc-ink-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
