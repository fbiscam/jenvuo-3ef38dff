import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { JxBotLogo } from "@/components/brand/ProductLogos";
import { getBotUsage } from "@/lib/mt5-licenses.functions";
import { botPerformance, plTone } from "@/lib/bot-performance";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

const money = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toneClass = (v: number) => (plTone(v) === "up" ? "pl-up" : plTone(v) === "down" ? "pl-down" : "text-foreground");

/** Overview card: JX Bot total profit for the last 30 days (green profit / red loss), no chart. */
export default function BotPerformanceCard() {
  const load = useServerFn(getBotUsage);
  const { data, isLoading } = useQuery({ queryKey: ["bot-usage"], queryFn: () => load(), staleTime: 60_000 });
  const perf = useMemo(() => botPerformance(data?.rows ?? [], Date.now()), [data]);
  const shown = useAnimatedNumber(perf.total, !isLoading);

  return (
    <div className="console-card flex flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <JxBotLogo framed className="h-8 w-8" />
          <p className="text-[16px] font-medium text-foreground">JX Bot profit</p>
        </div>
        <span className="text-[14px] text-muted-foreground">Last 30 days      </span>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <p
          className={`text-[40px] font-medium leading-none tracking-tight tabular-nums transition-colors duration-500 ${isLoading ? "text-muted-foreground" : toneClass(perf.total)} ${shown.flash ? `value-flash-${shown.flash}` : ""}`}
          aria-label={isLoading ? undefined : money(perf.total)}
        >
          {isLoading ? "—" : money(Math.round(shown.value * 100) / 100)}
        </p>
        <Link to={perf.hasData || isLoading ? "/dashboard/bot-usage" : "/dashboard/jx-bot"} className="console-pill console-pill-white">
          {perf.hasData || isLoading ? "Bot usage" : "Set up JX Bot"}
        </Link>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-[16px] font-medium text-foreground">
          {perf.hasData ? `${perf.winDays} profit day${perf.winDays === 1 ? "" : "s"}, ${perf.lossDays} loss day${perf.lossDays === 1 ? "" : "s"}` : "No JX Bot results yet"}
        </p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {perf.hasData ? (
            <>
              Best day <span className="pl-up font-medium">{perf.best ? money(perf.best.v) : "$0.00"}</span>
              {" · "}Worst day <span className="pl-down font-medium">{perf.worst ? money(perf.worst.v) : "$0.00"}</span>
            </>
          ) : (
            "Profit from all your MT5 accounts shows here."
          )}
        </p>
      </div>
    </div>
  );
}
