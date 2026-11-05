import { useEffect, useState } from "react";
import type React from "react";
import JenvuMark from "@/components/JenvuMark";
import { getBotDailyProfit, type BotProfitStat } from "@/lib/bot-stats.functions";

const usd = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Three-stat bar under the developer section; first stat is live JX Bot profit (all accounts). */
export function HomeMetricsBar() {
  const [stat, setStat] = useState<BotProfitStat | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => getBotDailyProfit().then((s) => live && setStat(s)).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const items: { value: string; label: React.ReactNode; key: string }[] = [
    { key: "profit", value: stat ? usd(stat.profit) : "—", label: "JX Bot profit today" },
    {
      key: "models",
      value: "60+",
      label: (
        <span className="inline-flex items-center gap-2">
          models in
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.28em] text-gc-ink">
            <JenvuMark className="h-4 w-4" />
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
            <div className="text-[48px] font-bold leading-none tracking-tight text-gc-ink tabular-nums sm:text-[64px]">
              {it.value}
            </div>
            <p className="mt-5 text-[14px] text-gc-ink-muted">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
