import type React from "react";

/** New geometric "J" badge used only in the stats bar (separate from the site JenvuMark). */
function JBadge({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className={className}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" strokeWidth="1.6" />
      <path d="M9 7h7M14 7v6.5a3.5 3.5 0 0 1-7 0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Three-stat bar above Latest news. Only checkable facts — never a win-rate or profit promise. */
export function HomeMetricsBar() {
  const items: { value: string; label: React.ReactNode; key: string }[] = [
    { key: "pairs", value: "3", label: "live trading pairs" },
    {
      key: "models",
      value: "60+",
      label: (
        <span className="inline-flex items-center gap-2">
          models in
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.28em] text-gc-ink">
            <JBadge className="h-5 w-5" />
            Jenvu
          </span>
        </span>
      ),
    },
    { key: "sl", value: "100%", label: "trades with stop-loss" },
  ];

  return (
    <section className="w-full px-5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 border-y border-gc-line py-2 sm:grid-cols-3 sm:py-9">
        {items.map((it, i) => (
          <div
            key={it.key}
            className={`py-7 sm:py-1 ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0 sm:pl-9" : ""}`}
          >
            <div className="text-[48px] font-normal leading-none tracking-tight text-gc-ink tabular-nums sm:text-[64px]">
              {it.value}
            </div>
            <p className="mt-5 text-[14px] text-gc-ink-muted">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
