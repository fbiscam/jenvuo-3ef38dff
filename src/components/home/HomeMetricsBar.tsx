import { useEffect, useState } from "react";
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

  const items = [
    {
      value: stat ? usd(stat.profit) : "—",
      label: stat?.accounts
        ? `JX Bot profit today across ${stat.accounts} account${stat.accounts === 1 ? "" : "s"}`
        : "JX Bot profit today across all accounts",
    },
    { value: "100%", label: "of JX Bot trades placed with a stop loss" },
    { value: "60+", label: "models available through one API key" },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 border-y border-gc-line sm:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={`px-2 py-8 sm:px-8 sm:py-10 ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0" : ""}`}
          >
            <div className="text-[40px] font-semibold leading-none tracking-tight text-gc-ink tabular-nums sm:text-[52px]">
              {it.value}
            </div>
            <p className="mt-3 text-[14px] text-gc-ink-muted">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
