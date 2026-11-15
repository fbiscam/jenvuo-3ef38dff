import type React from "react";
import { DAILY_DRAWDOWN_PCT, DAILY_TARGET_PCT } from "@/lib/mt5-licenses";

/** "HASEEB" signature mark: geometric H monogram + wide lettering with a pen swash. */
function HaseebSign({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-gc-ink ${className}`} aria-label="Haseeb">
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d="M5 21 L11 5" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 23 L23 7" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 16 C9 12, 16 17, 25 11" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="relative inline-block pb-1 text-[11px] font-light uppercase tracking-[0.5em]">
        Haseeb
        <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-0.5 left-0 h-2 w-full">
          <path d="M1 6 C25 1, 55 8, 99 2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/**
 * JX Bot rules bar under the API section. Values read the real bot constants;
 * targets are limits the bot stops at, never a promised return.
 */
export function BotStatsBar() {
  const t = DAILY_TARGET_PCT;
  const items: { key: string; value: string; label: React.ReactNode }[] = [
    {
      key: "target",
      value: `${Math.min(t.pro, t.elite, t.ultra)}–${Math.max(t.pro, t.elite, t.ultra)}%`,
      label: `daily stop target per account (Pro ${t.pro}% · Elite ${t.elite}% · Ultra ${t.ultra}%)`,
    },
    {
      key: "dd",
      value: `${DAILY_DRAWDOWN_PCT}%`,
      label: (
        <span className="inline-flex flex-wrap items-center gap-2">
          daily drawdown guard by <HaseebSign />
        </span>
      ),
    },
    { key: "tf", value: "M15", label: "EUR/USD basket strategy · Asia & London sessions only" },
  ];

  return (
    <section className="site-edge w-full px-5 py-10 sm:py-14">
      <p className="mx-auto mb-6 max-w-7xl text-[13px] text-gc-ink-muted">JX Bot daily rules</p>
      <div className="mx-auto grid max-w-7xl grid-cols-1 border-y border-gc-line py-2 sm:grid-cols-3 sm:py-10">
        {items.map((it, i) => (
          <div
            key={it.key}
            className={`py-7 sm:py-1 ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0 sm:pl-9" : ""}`}
          >
            <div className="text-[44px] font-normal leading-none tracking-[-0.02em] text-gc-ink tabular-nums sm:text-[52px]">
              {it.value}
            </div>
            <div className="mt-6 text-[13px] text-gc-ink-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
